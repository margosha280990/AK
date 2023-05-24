<?php

require_once SITE_ROOT . '/lib/config.php';
require_once SITE_ROOT . '/lib/function.php';

class App {
	private $rDB;
	private $qSID;
	private $hSessionParams;
//	private $qWorkLoginId;
	private $sPageId;
	private $sPageDir;
	private $sPageLocation;
	private $sPageUrl;
	private $isAjax;
	private $inPrivateScope;
	private $isAuthLevelAdvanced;
	private $rMemcached;
	private $isKiosk;

//-----------------------------------------------------------------------------------------------------------------
	public function Run() {
		$this->rDB = db_connect(DB);
		if (!$this->rDB) {
			internal_error();
		}
		
		$sLang = null;
		$sPage = null;
		if (isset($_REQUEST[SOURCE_URL])) {
			if (!preg_match('/^\/(?:([a-z]{2})\/)?(?:(\w+)\.' . DEFAULT_EXTENSION . ')?$/u', strtolower($_REQUEST[SOURCE_URL]), $aMatches)) {
				redirect(HOME_PAGE);
			}
			$sLang = empty($aMatches[1]) ? null : $aMatches[1];
			$sPage = empty($aMatches[2]) ? null : $aMatches[2];
		}
		
		// begin auth
		if (isset($_COOKIE[AUTH_KEY]) && isUID($_COOKIE[AUTH_KEY])) {
			$qAuthKey = db_quote($this->rDB, $_COOKIE[AUTH_KEY]);
			if ($newSID = db_get_scalar($this->rDB, "select get_session_by_auth_key($qAuthKey);")) {
				if (isUID($newSID)) {
					setcookie(SID, $newSID, strtotime('+1 year'), null, null, null, true);
					$_COOKIE[SID] = $newSID;
				}
			}
			setcookie(AUTH_KEY, false);
		}
		//end auth
				
		$SID = empty($_COOKIE[SID]) ? null : $_COOKIE[SID];
		if (isset($SID) && !isUID($SID)) {
			setcookie(SID, false);
			setcookie(USER, false);
			redirect(HOME_PAGE);
		}

		$this->qSID = db_quote($this->rDB, $SID);
		$qLang = db_quote($this->rDB, $sLang);
		$qPage = db_quote($this->rDB, $sPage);
		$qExt = db_quote($this->rDB, DEFAULT_EXTENSION);
		$this->hSessionParams = json_decode(db_get_scalar($this->rDB, "select get_session_state($this->qSID, $qLang, $qPage, $qExt);"), true);

		if ($this->hSessionParams['status'] == 'ERROR') {
			redirect(HOME_PAGE);
		}

		$this->isAjax = ($_SERVER['REQUEST_METHOD'] == 'POST' && (isset($_SERVER['HTTP_X_AJAX_REQUEST']) && !empty($_SERVER['HTTP_X_AJAX_REQUEST']) && $_SERVER['HTTP_X_AJAX_REQUEST'] == 1));
		$this->inPrivateScope = ($this->hSessionParams['language'] == DEFAULT_LANGUAGE && isset($SID)); 
		$this->isAuthLevelAdvanced = in_array($this->hSessionParams['auth_level_id'], ['admin', 'super', 'manager']);
		
		if ($SID != ($this->hSessionParams['sid'] ?? null) || in_array($this->hSessionParams['auth_level_id'], ['admin', 'super']) && !in_array(REMOTE_ADDR, ['185.37.60.193', '95.47.240.173', '95.64.160.114', '217.24.177.236', '80.254.18.154', '95.188.83.223', '93.189.147.54'])) {
//		if ($SID != ($this->hSessionParams['sid'] ?? null)) {
			setcookie(SID, false);
			setcookie(USER, false);
			redirect(HOME_PAGE);
		}

		$USER = empty($_COOKIE[USER]) ? null : $_COOKIE[USER];
		if (isset($SID) && (!isset($USER) || $USER != $this->hSessionParams['work_login_id'])) {
			setcookie(USER, $this->hSessionParams['work_login_id'], strtotime('+1 year'), null, null, null, true);
		}

		$this->sPageId = $this->hSessionParams['page_id'];
		$this->sPageDir = PAGES_DIR . '/' . $this->hSessionParams['language'] . '/' . $this->sPageId;
		$this->sPageLocation = PAGES_LOCATION . '/' . $this->hSessionParams['language'] . '/' . $this->sPageId;
		$this->sPageUrl = $this->hSessionParams['page_url'];

		if (empty($this->hSessionParams['page_indexable'])) {
			header('X-Robots-Tag: noindex, nofollow');
		} 

		$this->rMemcached = mc_connect();
		
		$hPageContent = $this->errorResult("Ошибка загрузки модуля '$this->sPageId'");
		$sPageFileName = $this->sPageDir . '/' . $this->sPageId . '.' . DEFAULT_EXTENSION;
		if (is_readable($sPageFileName)) {
			try {
				$hPageContent = include_once $sPageFileName;
			}
			catch (ParseError $e) {
				$hPageContent = $this->errorResult($e->getMessage());
			}
		}
		else {
			$MC_key = MEMCACHED_PREFIX . 'content::' . $this->hSessionParams['language'] . '::' . $this->sPageId;
			if ($this->rMemcached) {
				$hContent = $this->rMemcached->get($MC_key);
			}
			if (empty($hContent)) {
				$qPageId = db_quote($this->rDB, $this->sPageId);
				$qLanguage = db_quote($this->rDB, $this->hSessionParams['language']);
				if ($hContent = db_get_row($this->rDB, "select * from get_page_content($qPageId, $qLanguage);")) {
					if ($this->rMemcached && !empty($hContent)) {
						$this->rMemcached->set($MC_key, $hContent, 300);
					}
				}
			}
			if (!empty($hContent)) {
			  $hPageContent = [
					'status' => 'OK',
					'content' => $hContent['html'],
					'css_inline' => $hContent['css'],
					'js_inline' => $hContent['js']
				];
			}
		}
		if (isset($hPageContent['internal_echo']) && $hPageContent['internal_echo']) {
			exit();
		}
		if ($this->isAjax) {
			echo_json($hPageContent);
			exit();
		}

		$hMainTpl = $this->loadTemplate(MAIN_PAGE_DIR . '/main.html');
		if (!$hMainTpl) {
			internal_error();
		}

		$hPageVariables = [
			'language' => $this->hSessionParams['language'],
			'charset' => DEFAULT_CHARSET,
			'non_indexed' => empty($this->hSessionParams['page_indexable']) ? $hMainTpl['non_indexed'] : '',
			'title' => $this->hSessionParams['page_title'],
			'protocol' => PROTOCOL,
			'site_domain' => SITE_DOMAIN,
			'apple_icons' => mb_strpos(USER_AGENT, 'Mac OS') ? $hMainTpl['apple_icons'] : '',
			'current_year' => date('Y')
		];
		
		$aCSS = [
			'normalize.css',
			'vars.css',
			'base.css',
			'core.css',
			'main.css',
			'slider.css'
		];

		$aJS = [
			'function.js',
			'core.js'
		];

		$aJsInline = [
			compile_template($hMainTpl['core_js_inline'], [
				'tpl' => json_encode_template([
					'error_panel' => $hMainTpl['error_panel']
				]) 
			])
		];
		if (YANDEX_METRIKA && !$this->isAuthLevelAdvanced) {
			$aJsInline[] = $hMainTpl['ya_metrika'];
		}

		if ($this->inPrivateScope) {
			$aJS[] = 'main.js';
			$this->isKiosk = (isset($_SERVER['HTTP_X_AK_KIOSK']) && !empty($_SERVER['HTTP_X_AK_KIOSK']) && $_SERVER['HTTP_X_AK_KIOSK'] == 1);
			if ($this->isKiosk) {
				$aJS[] = 'autologout.js';
			}
		}
		elseif ($this->hSessionParams['language'] == DEFAULT_LANGUAGE) {
			$aJS[] = 'auth.js';
			$aJsInline[] = compile_template($hMainTpl['auth_js_inline'], [
				'tpl' => json_encode_template(['auth_panel' => base64_encode(compile_template($hMainTpl['auth_panel'], [
					'protocol' => PROTOCOL,
					'domain' => AUTH_SUBDOMAIN . '.' . SITE_DOMAIN
				]))])
			]);
		}

		$hPageVariables['logo'] = compile_template($hMainTpl['logo'], [
			'base_url' =>	$this->hSessionParams['base_url'],
			'logo_text' => $this->inPrivateScope ? '' : $hMainTpl['logo_'.($this->hSessionParams['language'])]
		]);
		
		$hPageVariables['css_files'] = $this->compileResourceTemplate($hMainTpl['css_files'], array_merge($aCSS, $hPageContent['css_shared'] ?? []), $hPageContent['css_files'] ?? []);
		$hPageVariables['js_files'] = $this->compileResourceTemplate($hMainTpl['js_files'], array_merge($aJS, $hPageContent['js_shared'] ?? []), $hPageContent['js_files'] ?? []);

		if ($hPageContent['status'] == 'ERROR') {
			$hPageVariables['content'] = compile_template($hMainTpl['ERROR'], $hPageContent);
		}
		else {
			$hPageVariables['content'] = $hPageContent['content'];
		}

		$hMenuPages = [];
		foreach (array_keys($hMainTpl) as $sKey) {
			if (preg_match('/^MENU_BLOCK_/', $sKey)) {
			  if (preg_match_all('/\{([\w-]+?)\}/u', $hMainTpl[$sKey], $aMatches, PREG_PATTERN_ORDER)) {
					foreach ($aMatches[1] as $sMenuPage) {
						$hMenuPages[$sMenuPage] = $sKey;
					}
				}
			}
		}

		$needSeekBlock = false;
		$hMenuLinks = [];
		foreach ($this->hSessionParams['pages'] as $sPageId => $hPage) {
			if (in_array($sPageId, ['search', 'oem', 'oem_truck'])) {
				$needSeekBlock = true;
			}
			
			if (isset($hMenuPages[$sPageId])) {
				$hMenuLinks[$hMenuPages[$sPageId]][$sPageId] = compile_template($hMainTpl['PAGE_link'], $hPage);
			}

			$hPageVariables['PAGE_LINK_' . $sPageId] = compile_template($hMainTpl['PAGE_link'], $sPageId == $this->sPageId ? array_merge($hPage, ['class' => 'h_link_active']) : $hPage);
			$hPageVariables['PAGE_URL_' . $sPageId] = $hPage['url'];

			$sTplName = 'PAGE_BLOCK_' . $sPageId;
			if (isset($hMainTpl[$sTplName])) {
				$hData = array_merge($hPage, $this->hSessionParams);
				$hPageVariables[$sTplName] = compile_template($hMainTpl[$sTplName], $hData);
				if (isset($hMainTpl[$sPageId . '_js_inline'])) {
					$aJsInline[] = compile_template($hMainTpl[$sPageId . '_js_inline'], $hData, true);
				}
			}
		}

		foreach ($hMenuLinks as $sMenuId => $aMenuLinks) {
			$hPageVariables[$sMenuId] = compile_template($hMainTpl[$sMenuId], $aMenuLinks);
		} 
		
		if ($needSeekBlock) {
			$aUrls = [];
			$aPlaceholder = [];
			if (isset($this->hSessionParams['pages']['search'])) {
				$aUrls['search'] = $this->hSessionParams['pages']['search']['url'];
				$aPlaceholder[] = 'артикул товара';
				$aJsInline[] = compile_template($hMainTpl['used_parts_js_inline'], [
					'url' => $this->hSessionParams['pages']['search']['url']
				], true);
			}
			$aUrlsOem = [];
			foreach (['oem', 'oem_truck'] as $sPageId) {
				if (isset($this->hSessionParams['pages'][$sPageId])) {
					$aUrlsOem[] = $this->hSessionParams['pages'][$sPageId]['url'];
				}
			}
			if (!empty($aUrlsOem)) {
				$aPlaceholder[] = 'VIN-номер автомобиля';
				$aUrls['oem'] = $aUrlsOem;
				$aJsInline[] = compile_template($hMainTpl['used_vins_js_inline'], [
					'url' => $aUrlsOem[0]
				], true);
			}

			$aJsInline[] = compile_template($hMainTpl['seek_js_inline'], [
				'url' => json_encode($aUrls, JSON_UNESCAPED_UNICODE)
			], true);

			$hPageVariables['seek_block'] = compile_template($hMainTpl['seek_block'], ['placeholder' => implode($aPlaceholder, ' или ')]);
		}

		if (isset($hPageContent['js_inline'])) {
			$aJsInline[] = $hPageContent['js_inline'];
		}
		$hPageVariables['js_inline'] = implode($aJsInline, "\n");
		$hPageVariables['css_inline'] = $hPageContent['css_inline'] ?? '';

		$aLanguages = [];
		foreach ($this->hSessionParams['languages'] as $hLanguage) {
			$aLanguages[] = compile_template($hMainTpl['PAGE_link'], [
				'url' => $hLanguage['url'],
				'class' => $hLanguage['current'] ? 'f_lang_active' : 'f_lang',
				'title' => $hLanguage['name']
			]);
		}
		$hPageVariables['languages'] = implode(' | ', $aLanguages);

		echo_html(compile_template($hMainTpl['main'], $hPageVariables), $this->hSessionParams['language']);
	}

//-----------------------------------------------------------------------------------------------------------------
	private function errorResult($sMessage) {
		return [
			'status' => 'ERROR',
			'message' => $sMessage
		];
	}

//-----------------------------------------------------------------------------------------------------------------
	private function loadTemplate($sFileName) {
		$MC_key = MEMCACHED_PREFIX . 'tpl::' . $sFileName;
		if ($this->rMemcached && $hTemplate = $this->rMemcached->get($MC_key)) {
			return $hTemplate;
		}
		$hTemplate = load_template($sFileName);
		if ($this->rMemcached) {
			$this->rMemcached->set($MC_key, $hTemplate, 300);
		}
		return $hTemplate;
	}
	
//-----------------------------------------------------------------------------------------------------------------
	private function compileResourceTemplate($sTpl, $aMainResource, $aPageResource) {
		$aCompiledResources = [];
		foreach ($aMainResource as $sResourceFileName) {
			$aCompiledResources[] = compile_template($sTpl, ['url' => $this->getFileUrl($sResourceFileName, MAIN_PAGE_DIR, MAIN_PAGE_LOCATION)]);
		}
		foreach ($aPageResource as $sResourceFileName) {
			$aCompiledResources[] = compile_template($sTpl, ['url' => $this->getFileUrl($sResourceFileName, $this->sPageDir, $this->sPageLocation)]);
		}
		return implode("\n", $aCompiledResources);
	}

//-----------------------------------------------------------------------------------------------------------------
	private function getFileUrl($sFileName, $sDir, $sLocation) {
		return $sLocation . '/' . $sFileName . '?' . http_build_query(['v' => filemtime($sDir . '/' . $sFileName)]);
	}
}
