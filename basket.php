<?php

$sAction = get_cgi_param('act', 'string', '');

switch ($sAction) :
	case 'setQuantity':
		if (!$this->isAjax) {
			return [
				'status' => 'REDIRECT',
				'url' => HOME_PAGE
			];
		}

		$iBasketId = get_cgi_param('basket_id', 'int', 0);
		$iQuantity = get_cgi_param('quantity', 'int', 0);
		$iVersion = get_cgi_param('version', 'int', 0);
		if (!$iBasketId || !$iQuantity || !$iVersion) {
			return $this->errorResult('Получены неверные параметры.');
		}
		
		$hResult = db_get_row($this->rDB, "select * from set_basket_quantity($this->qSID, $iBasketId, $iVersion, $iQuantity);");
		if ($hResult['status'] == 'OK') {
			$hTotalSum = db_get_row($this->rDB, "select * from get_basket_total_sum($this->qSID);");
	    $hResult = array_merge([
				'data' => db_get_all($this->rDB, "select * from get_basket_list($this->qSID);")
			], $hTotalSum, $hResult);
    }
    
		return $hResult;
		break;
	case 'setComment':
		if (!$this->isAjax) {
			return [
				'status' => 'REDIRECT',
				'url' => HOME_PAGE
			];
		}

		$iBasketId = get_cgi_param('basket_id', 'int', 0);
		$sComment = get_cgi_param('comment', 'text');
		$iVersion = get_cgi_param('version', 'int', 0);
		if (!$iBasketId || $sComment === NULL || !$iVersion) {
			return $this->errorResult('Получены неверные параметры.');
		}
		$qComment = db_quote($this->rDB, mb_substr($sComment, 0, 255));

		$hResult = db_get_row($this->rDB, "select * from set_basket_comment($this->qSID, $iBasketId, $iVersion, $qComment);");
		if ($hResult['status'] == 'OK') {
			$hTotalSum = db_get_row($this->rDB, "select * from get_basket_total_sum($this->qSID);");
			$hResult = array_merge([
				'data' => db_get_all($this->rDB, "select * from get_basket_list($this->qSID);")
			], $hTotalSum, $hResult);
		}
		
		return $hResult;
		break;
	case 'toggleInOrder':
		if (!$this->isAjax) {
			return [
				'status' => 'REDIRECT',
				'url' => HOME_PAGE
			];
		}

		$iBasketId = get_cgi_param('basket_id', 'int', 0);
		$sInOrder = get_cgi_param('in_order', 'bool', 'true');
		$iVersion = get_cgi_param('version', 'int', 0);
		if (!$iBasketId || !$iVersion) {
			return $this->errorResult('Получены неверные параметры.');
		}
		$qInOrder = db_quote($this->rDB, $sInOrder);

		$hResult = db_get_row($this->rDB, "select * from set_basket_in_order($this->qSID, $iBasketId, $iVersion, $qInOrder);");
		if ($hResult['status'] == 'OK') {
			$hTotalSum = db_get_row($this->rDB, "select * from get_basket_total_sum($this->qSID);");
			$hResult = array_merge([
				'data' => db_get_all($this->rDB, "select * from get_basket_list($this->qSID);")
			], $hTotalSum, $hResult);
		}

		return $hResult;
		break;
	case 'add':
		if (!$this->isAjax) {
			return [
				'status' => 'REDIRECT',
				'url' => HOME_PAGE
			];
		}

		$iPartId = get_cgi_param('part_id', 'int', 0);
		$iWarehouseId = get_cgi_param('warehouse_id', 'int', 0);
		$iQuantity = get_cgi_param('quantity', 'int', 0);
		$qSrc = db_quote($this->rDB, mb_substr(get_cgi_param('src', 'text', '{}'), 0, 2048));
		if (!$iPartId || !$iWarehouseId || !$iQuantity) {
			return $this->errorResult('Получены неверные параметры.');
		}

		return db_get_row($this->rDB, "select * from add_to_basket($this->qSID, $iPartId, $iWarehouseId, $iQuantity, $qSrc);");
		break;
	case 'del':
		if (!$this->isAjax) {
			return [
				'status' => 'REDIRECT',
				'url' => HOME_PAGE
			];
		}

		$iBasketId = get_cgi_param('id', 'int', 0);
		$iVersion = get_cgi_param('version', 'int', 0);
		if (!$iBasketId || !$iVersion) {
			return $this->errorResult('Получены неверные параметры.');
		}

		$hResult = db_get_row($this->rDB, "select * from del_from_basket($this->qSID, $iBasketId, $iVersion);");
		if ($hResult['status'] == 'OK') {
			$hTotalSum = db_get_row($this->rDB, "select * from get_basket_total_sum($this->qSID);");
	    $hResult = array_merge([
				'data' => db_get_all($this->rDB, "select * from get_basket_list($this->qSID);"),
			], $hTotalSum, $hResult);
		}
    
		return $hResult;
		break;
	case 'clear':
		if (!$this->isAjax) {
			return [
				'status' => 'REDIRECT',
				'url' => HOME_PAGE
			];
		}

		return db_get_row($this->rDB, "select * from clear_basket($this->qSID);");
		break;
	case 'checkConditions':
		if (!$this->isAjax) {
			return [
				'status' => 'REDIRECT',
				'url' => HOME_PAGE
			];
		}

		$sDeliveryMode = get_cgi_param('delivery_mode', 'base64');
		if (is_null($sDeliveryMode)) {
			return $this->errorResult('Неверный параметр: delivery_mode');
		}
		$qDeliveryMode = db_quote($this->rDB, base64_decode($sDeliveryMode)); 

	  $aConditionData = db_get_all($this->rDB, "select * from get_basket_conditions($this->qSID, $qDeliveryMode);");
		if (empty($aConditionData)) {
			return [
				'status' => 'SKIP'
			];
		}

		return [
			'status' => 'OK',
			'data' => $aConditionData
		];
		break;
	case 'acceptConditions':
		if (!$this->isAjax) {
			return [
				'status' => 'REDIRECT',
				'url' => HOME_PAGE
			];
		}

		$sBasketRows = get_cgi_param('basket_rows', 'raw');
		$hBasketRows = json_decode($sBasketRows, true);
		if (is_null($hBasketRows)) {
			return $this->errorResult('Неверный параметр: basket_rows');
		}
		$qBasketRows = db_quote($this->rDB, $sBasketRows);
		$sDeliveryMode = get_cgi_param('delivery_mode', 'base64');
		if (is_null($sDeliveryMode)) {
			return $this->errorResult('Неверный параметр: delivery_mode');
		}
		$qDeliveryMode = db_quote($this->rDB, base64_decode($sDeliveryMode)); 

		$hResult = db_get_row($this->rDB, "select * from set_basket_conditions($this->qSID, $qDeliveryMode, $qBasketRows);");
		if ($hResult['status'] == 'OK') {
			$hTotalSum = db_get_row($this->rDB, "select * from get_basket_total_sum($this->qSID);");
	    $hResult = array_merge([
				'data' => db_get_all($this->rDB, "select * from get_basket_list($this->qSID);"),
			], $hTotalSum, $hResult);
		}
    
		return $hResult;
		break;
	case 'getOutposts':
		if (!$this->isAjax) {
			return [
				'status' => 'REDIRECT',
				'url' => HOME_PAGE
			];
		}

		$sDeliveryMode = get_cgi_param('delivery_mode', 'base64');
		if (is_null($sDeliveryMode)) {
			return $this->errorResult('Неверный параметр: delivery_mode');
		}
		
		if (base64_decode($sDeliveryMode) != 'Самовывоз') {
			return [
				'status' => 'SKIP'
			];
		}
		
		return [
			'status' => 'OK',
			'data' => json_decode(db_get_scalar($this->rDB, "select * from get_outposts_list($this->qSID);"), true)
		];
		break;
	case 'checkout':
		if (!$this->isAjax) {
			return [
				'status' => 'REDIRECT',
				'url' => HOME_PAGE
			];
		}

		$sDeliveryMode = get_cgi_param('delivery_mode', 'base64');
		if (is_null($sDeliveryMode)) {
			return $this->errorResult('Неверный параметр: delivery_mode');
		}
		$qDeliveryMode = db_quote($this->rDB, base64_decode($sDeliveryMode)); 

		$sOutpostId = get_cgi_param('outpost_id', 'base64');
		$qOutpostId = db_quote($this->rDB, (is_null($sOutpostId) ? $sOutpostId : base64_decode($sOutpostId))); 

		return db_get_row($this->rDB, "select * from create_checkout($this->qSID, $qDeliveryMode, $qOutpostId);");
		break;
	case 'getTotalSum':
		if (!$this->isAjax) {
			return [
				'status' => 'REDIRECT',
				'url' => HOME_PAGE
			];
		}

		return [
			'status' => 'OK',
			'data' => db_get_row($this->rDB, "select * from get_basket_total_sum($this->qSID);")
		];
		break;
	default:
		$hBasketTpl = $this->loadTemplate($this->sPageDir . '/basket.html');
		if (!$hBasketTpl) {
			return $this->errorResult('Ошибка загрузки шаблона basket.html');
		}
		$sJsInline = $hBasketTpl['js_inline'];
		unset($hBasketTpl['js_inline']);
		$sBasketContent = $hBasketTpl['basket'];
		unset($hBasketTpl['basket']);

		$hTotalSum = db_get_row($this->rDB, "select * from get_basket_total_sum($this->qSID);");

		return [
			'status' => 'OK',
			'content' => $sBasketContent,
			'css_shared' => [
				'tbl.css'
			],
			'css_files' => [
				'basket.css'
			],
			'js_files' => [
				'basket.js'
			],
			'js_inline' => compile_template($sJsInline, array_merge([
				'url' => $this->sPageUrl,
				'tpl' => json_encode_template($hBasketTpl),
				'data' => json_encode(db_get_all($this->rDB, "select * from get_basket_list($this->qSID);"), JSON_UNESCAPED_UNICODE)
			], $hTotalSum))
		];
endswitch;
