<?php

$catalog_id = 5637146826;
$sAction = get_cgi_param('act', 'string', '');

switch ($sAction) :
	case 'filtrate':
		if (!$this->isAjax) {
			return [
				'status' => 'REDIRECT',
				'url' => HOME_PAGE
			];
		}

		$sBrand = get_cgi_param('brand', 'intA');
		$qBrand = 'null';
		if (!is_null($sBrand)) {
			$qBrand = db_quote($this->rDB, '{' . $sBrand . '}');
		}

		$sVolume = get_cgi_param('volume', 'intA');
		$qVolume = 'null';
		if (!is_null($sVolume)) {
			$qVolume = db_quote($this->rDB, '{' . $sVolume . '}');
		}

		$sProgram = get_cgi_param('program', 'intA');
		$qProgram = 'null';
		if (!is_null($sProgram)) {
			$qProgram = db_quote($this->rDB, '{' . $sProgram . '}');
		}

		$sTenacity = get_cgi_param('tenacity', 'intA');
		$qTenacity = 'null';
		if (!is_null($sTenacity)) {
			$qTenacity = db_quote($this->rDB, '{' . $sTenacity . '}');
		}

		$sAvailable = get_cgi_param('available', 'bool', 'false');
		$sSortField = get_cgi_param('sort_field', 'text', '');
		$qSortField = db_quote($this->rDB, $sSortField);
		$sSortAsc = get_cgi_param('sort_asc', 'bool', 'true');

		return [
			'status' => 'OK',
			'data' => db_get_all($this->rDB, "select * from get_catalog_oil_list($this->qSID, $catalog_id, $qBrand, $qVolume, $qProgram, $qTenacity, $sAvailable, $qSortField, $sSortAsc);"),
		];
		break;		
	default:
		$hOilTpl = $this->loadTemplate($this->sPageDir . '/catalog_oil.html');
		if (!$hOilTpl) {
			return $this->errorResult("Ошибка загрузки шаблона 'catalog_oil.html'");
		}

		$sContent = $hOilTpl['oil'];
		$sJsInline = $hOilTpl['js_inline'];
		unset($hOilTpl['oil']);
		unset($hOilTpl['js_inline']);
	
		return [
			'status' => 'OK',
			'content' => $sContent,
			'css_shared' => [
				'catalog.css'
			],
			'css_files' => [
				'catalog_oil.css'
			],
			'js_files' => [
				'catalog_oil.js'
			],
			'js_inline' => compile_template($sJsInline, [
				'url' => $this->sPageUrl,
				'tpl' => json_encode_template($hOilTpl),
				'filters' => db_get_scalar($this->rDB, "select get_part_attribute_filters($catalog_id);")
			])
		];
endswitch;
