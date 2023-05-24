//----------------------------------------------------------------------------------------------------------------------------------------------
Extend('oApp.oSeek', {
	timerId: 0,
	oAjaxId: {},
	aResultUrl: [],
	
	show: function(el) {
		oApp.core.dropdown.show(el);
		oApp.oUsedParts.load();
		oApp.oUsedVins.load();
	},
	
	find: function(el) {
		this.timerReset();
		var rawVal = el.value;
		if (rawVal) {
			showById('h_seek_clear');
			var val = rawVal.replace(/\s+/g, ' ').trim();
			if (val) {
				this.timerId = setTimeout(this.findText.bind(this), 300, val);
			}
		}
		else {
			this.clearResult();
		}
	},
	
	clear: function(id) {
		event.stopPropagation();
		this.timerReset();
		this.clearResult();
		var el = getById(id);
		el.value = '';
		el.focus();
	},
	
	press: function() {
		if (!event.repeat && event.key == 'Enter' && this.aResultUrl.length) {
			Redirect(this.aResultUrl[0]);
		}
	},

	clearResult: function() {
		for (var id in this.oAjaxId) {
			oApp.core.ajax.abort(this.oAjaxId[id]);
			delete this.oAjaxId[id];
		}
		this.aResultUrl = [];
		hideById('h_seek_clear');
		hideById('h_vin_result_wrap');
		setHTML('h_vin_result', '');
		getById('h_vin_result').classList.remove('preloader');
		setHTML('h_code_result', '');
		getById('h_code_result').classList.remove('preloader');
	},
		
	timerReset: function() {
		if (this.timerId) {
			clearTimeout(this.timerId);
			this.timerId = 0;
		}
	},
	
	findText: function(text) {
		this.aResultUrl = [];
		var oThis = this;
		if (oApp.core.checkVin(text)) {
			if (isDefined(this.url.oem)) {
				showById('h_vin_result_wrap');
				this.vinRows = [];
				for (var i = 0, lni = this.url.oem.length; i < lni; i++) {
					this.oAjaxId[this.url.oem[i]] = oApp.core.ajax.sendForm(
						{
							URL: this.url.oem[i],
							abortPrev: true,
							timeout: 5000,
							addLoaderHandler: function() {
								setHTML('h_vin_result', '');
								getById('h_vin_result').classList.add('preloader');
							},
							removeLoaderHandler: function() {
								getById('h_vin_result').classList.remove('preloader');
							},
							handler: function(response) {
								if (response.status == 'OK') {
									if (response.data.length > 0) {
										for (var j = 0, lnj = response.data.length; j < lnj; j++) {
											var url = getQueryUrl(this.URL, response.data[j]);
											if (j == 0) {
												oThis.aResultUrl.unshift(url);
											}
											oThis.vinRows.push(tplCompile(oThis.tplRowVin, Apply(response.data[j], {vin_url: url})));
										}
									}
		            }
								else if (response.status == 'ERROR') {
									oThis.vinRows.push(oThis.tplError);
								}
								if (isDefined(oThis.vinGetOtherAnswer)) {
									if (oThis.vinRows.length > 0) {
										setHTML('h_vin_result', oThis.vinRows.join(''));
									}
									else {
										setHTML('h_vin_result', oThis.tplEmpty);
									}
								}
								else {
									oThis.vinGetOtherAnswer = true;
								}
								delete oThis.oAjaxId[this.URL];
							}
						},
						{
							act: 'searchByVin',
							vin: text
						}
					);
				}
			}
		}
		else {
			hideById('h_vin_result_wrap');
			setHTML('h_vin_result', '');
		}
		
		if (isDefined(this.url.search)) {
			this.oAjaxId[this.url.search] = oApp.core.ajax.sendForm(
				{
					URL: this.url.search,
					abortPrev: true,
					addLoaderHandler: function() {
						setHTML('h_code_result', '');
						getById('h_code_result').classList.add('preloader');
					},
					removeLoaderHandler: function() {
						getById('h_code_result').classList.remove('preloader');
					},
					handler: function(response) {
						if (response.status == 'OK') {
							if (response.data.length > 0) {
								var partRows = [];
								for (var i = 0, ln = response.data.length; i < ln; i++) {
									var url = getQueryUrl(oThis.url.search, {part_id: response.data[i].part_id});
									if (i == 0) {
										oThis.aResultUrl.push(url);
									}
									partRows.push(tplCompile(oThis.tplRowPart, Apply(response.data[i], {part_url: url})));
								}
								setHTML('h_code_result', partRows.join(''));
							}
							else {
								setHTML('h_code_result', oThis.tplEmpty);
							}
						}
						else if (response.status == 'ERROR') {
							setHTML('h_code_result', oThis.tplError);
						}
						delete oThis.oAjaxId[this.URL];
					}
				},
				{
					act: 'searchByText',
					text: text
				}
			);
		}
	}
});

//----------------------------------------------------------------------------------------------------------------------------------------------
Extend('oApp.core', {
	checkVin: function(value) {
		value = value.toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/[OQ]/g, '0').replace(/I/g, '1');
		return /^[0-9ABCDEFGHJKLMNPRSTUVWXYZ]{17}$/.test(value);
	}
});

//----------------------------------------------------------------------------------------------------------------------------------------------
Extend('oApp.oUsedParts', {
	isRender: false,
	
	load: function() {
		if (isDefined(this.url) && !this.isRender) {
			var oThis = this;
			appendInto('h_seek_history', this.tpl);
			this.isRender = true;
			oApp.core.ajax.sendForm(
				{
					URL: this.url,
					abortPrev: true,
					addLoaderHandler: function() {
						getById('h_used_parts').classList.add('preloader');
					},
					removeLoaderHandler: function() {
						getById('h_used_parts').classList.remove('preloader');
					},
					handler: function(response) {
						if (response.status == 'OK') {
							if (response.data.length > 0) {
								var aRows = [];
								for (var i = 0, ln = response.data.length; i < ln; i++) {
									var oRow = response.data[i];
									aRows.push(tplCompile(oThis.tplRow, Apply(oRow, {
										part_url: getQueryUrl(oThis.url, {part_id: oRow.part_id})
									})));
								}
								setHTML('h_used_parts', aRows.join(''));
							}
						}
						else if (response.status == 'ERROR') {
							setHTML('h_used_parts', oThis.tplError);
						}
					}
				},
				{
					act: 'getUsed'
				}
			);
		}
	}
});

//----------------------------------------------------------------------------------------------------------------------------------------------
Extend('oApp.oUsedVins', {
	isRender: false,
	
	load: function() {
		if (isDefined(this.url) && !this.isRender) {
			var oThis = this;
			appendInto('h_seek_history', this.tpl);
			this.isRender = true;
			oApp.core.ajax.sendForm(
				{
					URL: this.url,
					abortPrev: true,
					addLoaderHandler: function() {
						getById('h_used_vins').classList.add('preloader');
					},
					removeLoaderHandler: function() {
						getById('h_used_vins').classList.remove('preloader');
					},
					handler: function(response) {
						if (response.status == 'OK') {
							if (response.data.length > 0) {
								var oRow = [];
								for (var i = 0, ln = response.data.length; i < ln; i++) {
									oRow.push(tplCompile(oThis.tplRow, response.data[i]));
								}
								setHTML('h_used_vins', oRow.join(''));
							}
						}
						else if (response.status == 'ERROR') {
							setHTML('h_used_vins', oThis.tplError);
						}
					}
				},
				{
					act: 'getUsed'
				}
			);
		}
	}
});

//----------------------------------------------------------------------------------------------------------------------------------------------
Extend('oApp.oBasket', {
	getTotalSum: function() {
		if (isDefined(this.url)) {
			var oThis = this;
			oApp.core.ajax.sendForm(
				{
					URL: this.url,
					abortPrev: true,
					handler: function(response) {
						if (response.status == 'OK') {
							setHTML('basket_total_sum', response.data.total_sum > 0 ? tplCompile(oThis.sumTpl, response.data) : '');
						}
					}
				},
				{
					act: 'getTotalSum'
				}
			);
		}
	}
});

//----------------------------------------------------------------------------------------------------------------------------------------------
//	legacy
//----------------------------------------------------------------------------------------------------------------------------------------------
var datePickerParams = {
	showOn: 'button',
	showAnim: '',
	buttonImage: '/content/img/ico_calendar.svg',
	buttonImageOnly: true,
	buttonText: 'выберите дату',
	nextText: 'следующий',
	prevText: 'предыдущий',
	showOtherMonths: true,
	dateFormat: 'dd.mm.yy',
	altFormat: 'yy-mm-dd',
	dayNamesMin: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
	firstDay: 1,
	monthNames: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
}

var all_xhr = {};
function loadData(action, params) {
	var xhr = new XMLHttpRequest();
	all_xhr[params['act']] = xhr;
	xhr.open('POST', action.URL, true);
	xhr.setRequestHeader('X-Ajax-Request', '1');
	xhr.onload = function() {
		if (this.status == 200) {
			all_xhr[params['act']] = null;
			var response = JSON.parse(xhr.responseText);
			switch (response.status) {
				case 'RELOAD' :
					Reload();
				break;
				case 'REDIRECT' :
					Redirect(response.url);
				break;
				default :
					action.handler(JSON.parse(xhr.responseText));
				break;
			}
		}
		else {
			action.handler({
				status: 'ERROR',
				message: 'При получении данных с сервера произошла ошибка. Пожалуйста, повторите операцию позже.'
			});
		}
	};
	xhr.onerror = function() {
		errorMessage('Не удалось получить данные с сервера. Пожалуйста, повторите операцию позже.');
	};
	var formData = new FormData();
	for (p in params) {
		formData.append(p, params[p]);
	}
	xhr.send(formData);
//	return xhr;
}

/**
* Функция изменения значения количества позиций товара
* @params Объект вида {value: value, step: 'minus/plus', package: package, minVal: minVal}
*/
function checkQuantity(params) {
	var package = parseInt(params.package);
	var minVal = params.minVal || 0;
	var currentQuantity = parseInt(params.value);
	var newQuantity = 0;
	
	if (params.step) {
		//var value = (params.step === 'minus') ? currentQuantity - package : currentQuantity + package;
		newQuantity = initValue(package, currentQuantity + package*params.step, minVal);
	}
	else {
		newQuantity = initValue(package, currentQuantity, minVal);
	}
	console.log('checkQuantity params', currentQuantity, newQuantity, params);
	
	return newQuantity;
}

/**
* Функция вычисляет новое значение количества товара
* @package Кратность товара
* @value Значение количества для проверки
* @minVal Минимальное значение, коорое может принимать количество
*/
function initValue(package, value, minVal) {
	var maxVal = 999;
	if (isNaN(value)) {
		value = minVal;
	}
	
	if (value % package > 0) {
		value = value - value % package;
	}
		
	if (value <= 0) {
		value = minVal;
	}
	if (value > maxVal) {
		value = maxVal;
	}
	
	return value;
}
