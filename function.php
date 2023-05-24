<?php
//-----------------------------------------------------------------------------------------------------------------
function db_connect($hConfig) {
	$sParams = 'host='.$hConfig['host'].' port='.$hConfig['port'].' dbname='.$hConfig['db'].' user='.$hConfig['user'].' password='.$hConfig['pass'];
	$rDBLink = $hConfig['use_persistent'] ? pg_pconnect($sParams) : pg_connect($sParams);
	if ($rDBLink) {
		if (!pg_query($rDBLink, "SET client_encoding = 'UTF8'; SET search_path = {$hConfig['schema']};")) {
			return false;
		}
	}
	return $rDBLink;
}

//-----------------------------------------------------------------------------------------------------------------
function db_get_all($rLink, $sQuery) {
	$rResult = pg_query($rLink, $sQuery);
	$aValue = $rResult ? pg_fetch_all($rResult) : [];
	pg_free_result($rResult);
	return $aValue ? $aValue : [];
}

//-----------------------------------------------------------------------------------------------------------------
function db_get_row($rLink, $sQuery) {
	$rResult = pg_query($rLink, $sQuery);
	$hValue = [];
	if ($rResult) {
		if (pg_num_rows($rResult) > 0) {
			$hValue = pg_fetch_assoc($rResult, 0);
		}
	}
	pg_free_result($rResult);
	return $hValue;
}

//-----------------------------------------------------------------------------------------------------------------
function db_get_column($rLink, $sQuery) {
	$rResult = pg_query($rLink, $sQuery);
	$aValue = [];
	if ($rResult) {
		if (pg_num_rows($rResult) > 0) {
			$aValue = pg_fetch_all_columns($rResult, 0);
		}
	}
	pg_free_result($rResult);
	return $aValue;
}

//-----------------------------------------------------------------------------------------------------------------
function db_get_scalar($rLink, $sQuery) {
	$rResult = pg_query($rLink, $sQuery);
	$sValue = NULL;
	if ($rResult) {
		if (pg_num_rows($rResult) > 0) {
			$sValue = pg_fetch_result($rResult, 0, 0);
		}
	}
	pg_free_result($rResult);
	return $sValue ? $sValue : NULL;
}

//-----------------------------------------------------------------------------------------------------------------
function db_do($rLink, $sQuery) {
	$rResult = pg_query($rLink, $sQuery);
	pg_free_result($rResult);
}

//-----------------------------------------------------------------------------------------------------------------
function db_quote($rLink, $sValue) {
	if (is_null($sValue)) {
		return 'null';
	}
	if (is_int($sValue)) {
		return $sValue;
	}
	return pg_escape_literal($rLink, $sValue);
}

//-----------------------------------------------------------------------------------------------------------------
function mc_connect() {
	if (MEMCACHED_DISABLED) {
		return false;
	}
	$rMC = new Memcached();
	$rMC->addServer(MEMCACHED_SOCKET, 0);
	return (current($rMC->getStats())['pid'] == -1 ? false : $rMC);
}

//-----------------------------------------------------------------------------------------------------------------
function set_headers() {
	header('Pragma: no-cache');
	header('Cache-Control: no-store, no-cache, max-age=0, must-revalidate, no-transform, post-check=0, pre-check=0');
	header('Expires: Thu, 01 Jan 1970 00:00:00 GMT');
}

//-----------------------------------------------------------------------------------------------------------------
function echo_html($sContent, $sLanguage = DEFAULT_LANGUAGE) {
	set_headers();
	header('Content-Language: '.$sLanguage);
	header('Content-Type: text/html; charset='.DEFAULT_CHARSET);
	echo $sContent;
}

//-----------------------------------------------------------------------------------------------------------------
function echo_json($sContent) {
	set_headers();
	header('Content-Type: application/json; charset='.DEFAULT_CHARSET);
	echo json_encode($sContent, JSON_UNESCAPED_UNICODE);
}

//-----------------------------------------------------------------------------------------------------------------
function redirect($sUrl, $iStatus = 302) {
	header('Location: '.PROTOCOL.'://'.SITE_DOMAIN.$sUrl, true, $iStatus);
	exit();
}

//-----------------------------------------------------------------------------------------------------------------
function forbidden() {
	http_response_code(403);
	exit();
}

//-----------------------------------------------------------------------------------------------------------------
function internal_error() {
	http_response_code(500);
	exit();
}

//-----------------------------------------------------------------------------------------------------------------
function get_cgi_param($sName, $sType, $default = NULL) {
	if (!isset($_REQUEST[$sName])) {
		return $default;
	}
	$value = (in_array($sType, ['pass', 'array']) ? $_REQUEST[$sName] : trim(strip_tags($_REQUEST[$sName])));
	switch ($sType) :
		case 'int' :
			if (preg_match('/^\d+?$/u', $value)) {
				if ((int)$value < 2**31) {
					return (int)$value;
				}
			}
			break;
		case 'intA' :
			if (preg_match('/^\s*\d+\s*(?:,\s*\d+\s*)*$/u', $value)) {
				return preg_replace('/\s+/u', '', $value);
			}
			break;
		case 'float' :
			if (preg_match('/^\d+(\.\d+)?$/u', $value)) {
				return (float)$value;
			}
			break;
		case 'string' :
			if (preg_match('/^[\w-]+$/u', $value)) {
				return $value;
			}
			break;
		case 'bool' :
			if (in_array($value, ['true', 'false'])) {
				return $value;
			}
			break;
		case 'text' :
			$value = preg_replace('/[^а-яА-ЯёЁ\x20-\x7E]/u', ' ', $value);
			return trim(preg_replace('/\s+/u', ' ', $value));
			break;
		case 'pass' :
			return preg_replace('/[^а-яА-ЯёЁ\x20-\x7E]/u', '', $value);
			break;
		case 'date' :  # Дата YYYY-MM-DD
			if (preg_match('/^20\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[1-2]\d|3[0-1])$/u', $value)) {
				return $value;
			}
			break;
		case 'time' :  # Время HH:MM
			if (preg_match('/^\d{2}:\d{2}$/u', $value)) {
				return $value;
			}
			break;
		case 'base64' :
			if (isBase64Encode($value)) {
				return $value;
			}
			break;
		case 'uid' :
			if (isUID($value)) {
				return $value;
			}
			break;
		case 'raw' :
			return $value;
			break;
		case 'array' :
		  if (is_array($value)) {
				return $value;
			}
			break;
	endswitch;

	return $default;
}

//-----------------------------------------------------------------------------------------------------------------
function load_template($sFileName) {
	$sTemplate = file_get_contents($sFileName);
	return $sTemplate ? parse_template($sTemplate) : $sTemplate;
}

//-----------------------------------------------------------------------------------------------------------------
function parse_template($sTemplate) {
	$hBlocks = [];
	if (preg_match_all('/<!-- begin::([\w-]+?) -->\s*(.*?)\s*<!-- end::\1 -->/usm', $sTemplate, $hMatches, PREG_SET_ORDER)) {
		foreach ($hMatches as $aMatches) {
			$hBlocks[$aMatches[1]] = $aMatches[2];
		}
	}
	return $hBlocks;
}

//-----------------------------------------------------------------------------------------------------------------
function compile_template($sTemplate, $hData, $bStrict = false) {
	return preg_replace_callback('/\{([\w-]+?)\}/u', function($aMatches) use ($hData, $bStrict) {
		return isset($hData[$aMatches[1]]) ? $hData[$aMatches[1]] : ($bStrict ? $aMatches[0] : '');
	}, $sTemplate);
}

//-----------------------------------------------------------------------------------------------------------------
function json_encode_template($sTpl) {
	return json_encode(str_replace(["\n", "\t"], '', $sTpl), JSON_UNESCAPED_UNICODE);
}

//-----------------------------------------------------------------------------------------------------------------
function isUID($uid) {
	return (bool)preg_match('/^([0-9a-f]){8}(-([0-9a-f]){4}){3}-([0-9a-f]){12}$/ui', $uid);
}

//-----------------------------------------------------------------------------------------------------------------
function isIP($ip) {
	return (bool)preg_match('/^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/u', $ip);
}

//-----------------------------------------------------------------------------------------------------------------
function isEmailList($str) {
	return (bool)preg_match('/^'.EMAIL_REGEXP.'(\s*[,;]\s*'.EMAIL_REGEXP.')*$/u', $str);
}

//-----------------------------------------------------------------------------------------------------------------
function isBase64Encode($base64) {
	return (bool)preg_match('/^(?:([a-z0-9+\/]){4})*(?1)(?:(?1)==|(?1){2}=|(?1){3})$/ui', $base64);
}

//-----------------------------------------------------------------------------------------------------------------
function unichr($i) {
	return mb_convert_encoding('&#'.intval($i).';', 'UTF-8', 'HTML-ENTITIES');
}

//-----------------------------------------------------------------------------------------------------------------
function uniord($s) {
	list(, $ord) = unpack('N', mb_convert_encoding($s, 'UCS-4BE', 'UTF-8'));
	return $ord;
}

//-----------------------------------------------------------------------------------------------------------------
function getCode128B($str) {
	$iSum = 104;
	$iWeight = 1;
	foreach (preg_split('//u', mb_substr(preg_replace('/[^\x20-\x7E]/u', '', $str), 0, 254), null, PREG_SPLIT_NO_EMPTY) as $sChr) {
		$iSum += (uniord($sChr) - 32) * $iWeight++;
	}
	$iResult = $iSum % 103;
	return unichr(236).$str.unichr($iResult + ($iResult > 94 ? 132 : 32)).unichr(238);
}

//-----------------------------------------------------------------------------------------------------------------
function get_web_page($hConfig, $hOptions) {
	$ch = curl_init();
	curl_setopt_array($ch, [
		CURLOPT_URL => 'http://'.$hConfig['host'],
		CURLOPT_POST => true,
		CURLOPT_HTTPAUTH => CURLAUTH_DIGEST,
		CURLOPT_USERPWD => $hConfig['user'].':'.$hConfig['pass'],
		CURLOPT_POSTFIELDS => $hOptions,
		CURLOPT_RETURNTRANSFER => 1
	]);
	$result = curl_exec($ch); 
	curl_close($ch);
	return $result;
}
