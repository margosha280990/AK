Extend('oApp.oBasket', {
	errorMessages: {
		login: 'В логине отсутствует договор или адрес поставки',
		warehouse: 'Склад недоступен для заказа',
		part: 'Товар недоступен для заказа',
		stock: 'Недостаточное количество на складе',
		package: 'Количество не кратно минимальной партии',
		lost: 'Срок хранения в корзине истёк'
	},

	parseResponce: function(response) {
		if (response.status == 'OK') {
			this.data = response.data;
			this.totalSum = response.total_sum;
			this.currencyName = response.currency_name;
//			setBasketTotalSum(this.totalSum, this.currencyName);
		}
		else if (response.status == 'ERROR') {
			oApp.core.errorMessage(response.message);
		}
		else if (response.status == 'CLASH') {
			this.onClash();
		}
		this.getTotalSum();
		this.сompile();
	},

	onClash: function() {
		oApp.core.errorMessage('По этой позиции были внесены изменения другим пользователем логина.<br>Сейчас будет обновлена корзина для получения актуальных данных.', Reload);
	},

	qtyKeyPress: function(e) {
		var keyCode = e.which;
		if (keyCode < 48 || keyCode > 57) {
			e.preventDefault();
		}
	},

	qtyKeyDown: function(id, version, e, el) {
		var keyCode = e.which;
		if (keyCode === 13) {
			this.saveQuantity(id, version, e, el, 0);
		}
		else if (keyCode === 27) {
			el.value = el.getAttribute('data-qty');
			el.blur();
		}
		else if (keyCode === 38) {
			this.saveQuantity(id, version, e, el, 1);
		}
		else if (keyCode === 40) {
			this.saveQuantity(id, version, e, el, -1);
		}
	},
	
	saveQuantity: function(id, version, e, el, sign) {
		var oThis = this;
		var qty = el.value.trim();
		var defQty = parseInt(el.getAttribute('data-qty'));
		if (/[^0-9]/.test(qty) || qty === '') {
		  el.value = defQty;
		  return;
		}
		var package = parseInt(el.getAttribute('data-pkg')) || 1;
		qty = Math.min(Math.max(parseInt(qty) + package * sign, package), 999);
		var checkedQty = qty - qty % package;
		el.value = checkedQty;
		if (checkedQty !== defQty && (e.type === 'click' || sign === 0)) {
			oApp.core.ajax.sendForm(
				{
					URL: this.url,
					handler: function(response) {
						el.setAttribute('data-qty', checkedQty);
						oThis.parseResponce(response);
					}
				},
				{
					act: 'setQuantity',
					basket_id: id,
					version: version,
					quantity: checkedQty
				}
			);
		}
	},
	
	saveComment: function(id, version, e, el) {
		var oThis = this;
		var keyCode = (e.type === 'blur' ? null : e.which);
		if (keyCode === 27) {
			el.value = el.getAttribute('data-initial');
			el.blur();
			return;
		}
		if (keyCode !== 13 && keyCode !== null) {
			return;
		}
		var value = el.value.trim(); 
		if (value !== el.getAttribute('data-initial')) {
			oApp.core.ajax.sendForm(
				{
					URL: this.url,
					handler: function(response) {
						el.setAttribute('data-initial', value);
						oThis.parseResponce(response);
					} 
				},
				{
					act: 'setComment',
					basket_id: id,
					version: version,
					comment: value
				}
			);
		}
	},

	toggleInOrder: function(id, version, el) {
		oApp.core.ajax.sendForm(
			{
				URL: this.url,
				handler: this.parseResponce.bind(this)
			},
			{
				act: 'toggleInOrder',
				basket_id: id,
				version: version,
				in_order: el.checked
			}
		);
	},

	del: function(id, version) {
		oApp.core.ajax.sendForm(
			{
				URL: this.url,
				handler: this.parseResponce.bind(this)
			},
			{
				act: 'del',
				id: id,
				version: version
			}
		);
	},

	clear: function() {
		oApp.core.ajax.sendForm(
			{
				URL: this.url,
				handler: function(response) {
					if (response.status == 'OK') {
						Redirect('/');
					}
					else if (response.status == 'ERROR') {
						oApp.core.errorMessage(response.message);
					}
				}
			},
			{
				act: 'clear'
			}
		);
	},

	checkConditions: function(deliveryMode) {
		var oThis = this;
		oApp.core.ajax.sendForm(
			{
				URL: this.url,
				handler: function(response) {
					if (response.status == 'OK') {
						oThis.showConditional(response.data, deliveryMode);
					}
					else if (response.status == 'SKIP') {
						oThis.getOutposts(deliveryMode);
					}
					else if (response.status == 'ERROR') {
						oApp.core.errorMessage(response.message);
					}
				}
			},
			{
				act: 'checkConditions',
				delivery_mode: deliveryMode
			}
		);
	},
	
	showConditional: function(data, deliveryMode) {
		var isOE = false;
		this.oAcceptRows = {};
		var aConditionsContent = [];
		
		for (var i = 0, ln = data.length; i < ln; i++) {
			if (parseInt(data[i].is_oe)) {
				isOE = true;
			}
			this.oAcceptRows[data[i].basket_id] = data[i].version;

			aConditionsContent.push(tplCompile(this.tpl.basket_condition_row, Apply({
				days: 'до ' + (parseInt(data[i].delivery_days) + 3) + ' дней',
				cls: parseInt(data[i].show_long_delivery) ? 'b' : ''
			}, data[i])));
		}
		oApp.core.panel.open({
			panelId: 'basket_conditions_panel',
			isCloseable: true,
			tpl: tplCompile(this.tpl.basket_conditions_panel, {
				basket_condition_rows: aConditionsContent.join(''),
				basket_condition_oem: (isOE ? this.tpl.basket_condition_oem : ''),
				delivery_mode: deliveryMode,
				ns: this.ns
			})
		});
	},

	showConfirmPanel: function() {
		oApp.core.panel.open({
			isCloseable: true,
			tpl: tplCompile(this.tpl.basket_clear_panel, {ns: this.ns})
		});
	},

	getOutposts: function(deliveryMode) {
		var oThis = this;
		oApp.core.ajax.sendForm(
			{
				URL: this.url,
				handler: function(response) {
					if (response.status == 'OK') {
						if (response.data.length) {
						  oThis.showOutpostsPanel(response.data, deliveryMode);
						}
						else {
						  oThis.goToCheckout(deliveryMode);
						}
					}
					else if (response.status == 'SKIP') {
					  oThis.goToCheckout(deliveryMode);
					}
					else if (response.status == 'ERROR') {
						oApp.core.errorMessage(response.message);
					}
				}
			},
			{
				act: 'getOutposts',
				delivery_mode: deliveryMode
			}
		);
	},

	showOutpostsPanel: function(data, deliveryMode) {
		this.oOutposts = {};
		var defaultId = '';
		var aOutposts = [];
		for (var i = 0, ln = data.length; i < ln; i++) {
			var oData = data[i];
			var outpostId = oData.id;
			delete oData.id;
			this.oOutposts[outpostId] = oData;

			aOutposts.push(tplCompile(this.tpl.outpost_link, {
				id: outpostId,
				name: oData.name,
				checked: (i == 0 ? 'checked' : ''),
				ns: this.ns
			}));
			
			if (i == 0) {
				defaultId = outpostId;
			}
		}

		oApp.core.panel.open({
			panelId: 'basket_outposts_panel',
			isCloseable: true,
			tpl: tplCompile(this.tpl.basket_outposts_panel, {
				delivery_mode: deliveryMode,
				outpost_content: aOutposts.join(''),
				ns: this.ns
			})
		});

		this.showDetail(defaultId);

		var oThis = this;
		loadScriptUrl('https://api-maps.yandex.ru/2.1/?load=package.full&lang=ru-RU', getById('outpost_map'), function() {
			ymaps.load(oThis.drawMap.bind(oThis, defaultId));
		});
	},
	
	showDetail: function(id) {
		var oExtData = {};
		if (isDefined(this.oOutposts[id].schedule)) {
			oExtData.schedule_blk = tplCompile(this.tpl.schedule_blk, this.oOutposts[id]);
		}
		var aPhone = this.oOutposts[id].phone.split(',');
		oExtData.phone_num = aPhone[0];
		oExtData.phone_dop = aPhone[1];
		
		if (isDefined(this.oOutposts[id].img)) {
			oExtData.image_blk = tplCompile(this.tpl.image_blk, {
				src: this.oOutposts[id].img,
				ns: this.ns
			});
		}

		setHTML('outpost_detail', tplCompile(this.tpl.outpost_blk, Apply(oExtData, this.oOutposts[id])));
		oApp.core.panel.onResize();
	},

	showImg: function(el) {
		oApp.core.panel.open({
			isCloseable: true,
			isEnterSpace: true,
			tpl: tplCompile(this.tpl.image_panel, {src: el.children[0].src})
		});
	},
	
	onSelect: function(id) {
		this.showDetail(id);
		this.zoomMap([this.oOutposts[id].latitude, this.oOutposts[id].longitude]);
	},

	drawMap: function(id) {
		this.myMap = new ymaps.Map('outpost_map', {
			center: [this.oOutposts[id].latitude, this.oOutposts[id].longitude],
			zoom: 14,
			controls: ['zoomControl', 'geolocationControl', 'fullscreenControl']
		}, {
			autoFitToViewport: 'always'
		});
		for (id in this.oOutposts) {	
			var mark = new ymaps.Placemark([this.oOutposts[id].latitude, this.oOutposts[id].longitude], {
				hintContent: this.oOutposts[id].name
			},
			{
				iconLayout: 'default#image',
				iconImageHref: '/content/img/placemark_AK.png',
				iconImageSize: [32, 32],
				iconImageOffset: [-5, -38]
			});
			this.myMap.geoObjects.add(mark);
		}
	},

	zoomMap: function(point) {
		this.myMap.panTo(point, {flying: true, duration: 1600}).then(function() {
			this.myMap.setCenter(point, 14);
		}.bind(this));
	},
	
	choiceOutpost: function(deliveryMode) {
		var outpostId = document.forms.outposts_form.outpost.value;
		if (!this.oOutposts[outpostId].is_outpost) {
			outpostId = '';
		}
		this.goToCheckout(deliveryMode, outpostId);
	},

	goToCheckout: function(deliveryMode, outpostId) {
		oApp.core.ajax.sendForm(
			{
				URL: this.url,
				handler: function(response) {
					if (response.status == 'OK') {
						Redirect('checkout.php');
					}
					else if (response.status == 'ERROR') {
						oApp.core.errorMessage(response.message);
					}
				}
			},
			{
				act: 'checkout',
				delivery_mode: deliveryMode,
				outpost_id: outpostId || ''
			}
		);
	},

	acceptConditions: function(deliveryMode) {
		var oThis = this;
		oApp.core.panel.close('basket_conditions_panel');
		oApp.core.ajax.sendForm(
			{
				URL: this.url,
				handler: function(response) {
					oThis.parseResponce(response);
					if (response.status == 'OK') {
						oThis.oAcceptRows = {};
						oThis.getOutposts(deliveryMode);
					}
				}
			},
			{
				act: 'acceptConditions',
				basket_rows: JSON.stringify(this.oAcceptRows),
				delivery_mode: deliveryMode
			}
		);
	},

	selectPart: function(id) {
		Redirect(getQueryUrl('/search.php', {part_id: id}));
	},
	
	сompile: function() {
		var aContent = [];
		var aWrongContent = [];
		var inOrderCnt = 0;
		var deliveryCnt = 0;
		var expressCnt = 0;
		var checkoutCnt = 0;
		for (var i = 0, ln = this.data.length; i < ln; i++) {
			var oData = this.data[i];
			if (oData.state === 'new') {
				var inOrder = parseInt(oData.in_order);
				inOrderCnt += inOrder;
				deliveryCnt += parseInt(oData.delivery) * inOrder;
				expressCnt += parseInt(oData.is_express) * inOrder;
				aContent.push(tplCompile(this.tpl.basket_row, Apply({
					in_order_checked: (inOrder ? 'checked' : ''), 
					condition_state: inOrder ? this.tpl[oData.condition_info] : '',
					ns: this.ns
				}, oData)));
			}
			else if (oData.state === 'err') {
				aWrongContent.push(tplCompile(this.tpl.basket_wrong_row, Apply(oData, {ns: this.ns, error_message: this.errorMessages[oData.error_message]})));
			}
			else if (oData.state === 'lost') {
				aWrongContent.push(tplCompile(this.tpl.basket_wrong_row, Apply(oData, {ns: this.ns, error_message: this.errorMessages.lost})));
			}
			else if (oData.state === 'chk') {
				checkoutCnt++;
			}
		}

		var aToolbar = [];
		if (checkoutCnt) {
			aToolbar.push(this.tpl.checkout_link);
		}
		if (this.data.length - checkoutCnt) {
			aToolbar.push(this.tpl.basket_clear);
		}
		if (aToolbar.length) {
			setHTML('basket_toolbar', tplCompile(aToolbar.join(''), {ns: this.ns}));
		}

		if ((aWrongContent.length + aContent.length) > 0) {
			if (aWrongContent.length > 0) {
				setHTML('basket_wrong_content', tplCompile(this.tpl.basket_wrong_table, {basket_wrong_rows: aWrongContent.join('')}));
			}
			else {
				setHTML('basket_wrong_content', '');
			}
	
			if (aContent.length > 0) {
				var aOrderButtons = [];
				if (inOrderCnt > 0) {
					aOrderButtons.push(this.tpl.basket_order_pickup_button);
					if (deliveryCnt > 0) {
						aOrderButtons.push(this.tpl.basket_order_delivery_button);
					}
					if (expressCnt > 0 && expressCnt < 11) {
						aOrderButtons.push(this.tpl.basket_order_express_button);
					}
					if (aOrderButtons.length > 1) {
						aOrderButtons.push(this.tpl.basket_order_help_button);
					}
				}
				setHTML('basket_content', tplCompile(this.tpl.basket_table, {
					'basket_rows': aContent.join(''),
					'total_sum': this.totalSum,
					'currency_name': this.currencyName,
					'basket_order_buttons': tplCompile(aOrderButtons.join(''), {ns: this.ns})
				}));
			}
			else {
			  setHTML('basket_content', '');
			}
		}
		else {
			setHTML('basket_content', this.tpl.basket_empty);
		}
	}
});

onLoad(oApp.oBasket.сompile.bind(oApp.oBasket));
