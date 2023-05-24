//----------------------------------------------------------------------------------------------------------------------------------------------
Extend('oApp.core.sessionStorage', {
	get: function(key) {
		if ('sessionStorage' in window) {
			return JSON.parse(sessionStorage.getItem(key));
		}
		return null;
	},
	
	set: function(key, value) {
		if ('sessionStorage' in window) {
			sessionStorage.setItem(key, JSON.stringify(value));
			if (sessionStorage.getItem(key)) {
				return true;
			}
		}
		return false;
	},
	
	del: function(key) {
		if ('sessionStorage' in window) {
			sessionStorage.removeItem(key);
		}
	}
});

//----------------------------------------------------------------------------------------------------------------------------------------------
Extend('oApp.core.panel', {
	aPanels: [],
	oDefaults: {
		className: 'ak_panel',
		isCloseable: true,
		isEnterSpace: false,
		bgPositionX: 0,
		bgPositionY: 0,
		offsetTop: 100,
		bgClassName: 'ak_panel_bg',
		tpl: '<div></div>'
	},
	classNameOpen: 'ak_panel_open',
	zIndex: 1000,
	oHandlers: {},
	
	open: function() {
		var options = Apply({}, arguments[0] || {}, this.oDefaults),
			numberOfPanels = this.aPanels.length,
			id = options.panelId || 'ak_panel_'+ (numberOfPanels + 1),
			el = document.createElement('div'),
			elBg = document.createElement('div');
			
		if (isArray(options.tpl)) {
			options.tpl = options.tpl.join('');
		}
		
		el.setAttribute('id', id);
		el.setAttribute('tabindex', (numberOfPanels + 1));
		el.className = options.className;
		el.style.zIndex = '' + (this.zIndex + numberOfPanels);
		el.insertAdjacentHTML('afterbegin', options.tpl.replace(/%close%/gi, this.ns + '.close(\''+ id +'\')'));

		options.bgPositionY = options.header ? this.getHeight('options.header') : 0; 
		elBg.setAttribute('id', id + '_bg');
		elBg.className = options.bgClassName;
		elBg.style.top = options.bgPositionY + 'px';
		elBg.style.left = options.bgPositionX + 'px';
		elBg.style.zIndex = '' + (this.zIndex + numberOfPanels);

		if (options.header) {
			this.oHandlers.clickHandler = this.onClick.bind(this);
			window.addEventListener('click', this.oHandlers.clickHandler, true);
		}
		
		if (numberOfPanels === 0) {
			this.oHandlers.keyHandler = this.onKeyDown.bind(this);
			this.oHandlers.resizeHandler = this.onResize.bind(this);
			window.addEventListener('keydown', this.oHandlers.keyHandler, true);
			window.addEventListener('resize', this.oHandlers.resizeHandler, true);
			getBody().classList.add(this.classNameOpen);
		}
		else {
			this.aPanels[0].elBg.style.display = 'none';
		}
		
		var oNew = {
			id: id,
			isCloseable: options.isCloseable,
			isEnterSpace: options.isEnterSpace,
			isMenu: options.header ? true : false,
			el: el,
			elBg: elBg
		};
		if (isDefined(options.closeHandler)) {
			oNew.closeHandler = options.closeHandler;
		}
		this.aPanels.unshift(oNew);
		
		if (isDefined(oNew.beforeOpen)) {
			oNew.beforeOpen();
		}
		
		getBody().appendChild(elBg);
		getBody().appendChild(el);
		
//		el.style.top = (options.positionY || (screen.height / 2 + window.scrollY) - (el.offsetHeight / 2) - this.oDefaults.offsetTop) + 'px';
		el.style.top = (options.positionY || (window.innerHeight / 2 + window.scrollY) - (el.offsetHeight / 2)) + 'px';
		el.style.left = (options.positionX || (window.innerWidth / 2 + window.scrollX) - (el.offsetWidth / 2)) + 'px';
	},

	close: function(id) {
		var oPanel = this.getPanel(id);
		if (isDefined(oPanel.beforeClose) && !oPanel.beforeClose()) {
			return;
		}
		
		getBody().removeChild(oPanel.el);
		getBody().removeChild(oPanel.elBg);
		this.removePanel(id);
		var numberOfPanels = this.aPanels.length;
		
		if (numberOfPanels === 0) {
			window.removeEventListener('keydown', this.oHandlers.keyHandler, true);
			window.removeEventListener('resize', this.oHandlers.resizeHandler, true);
			getBody().classList.remove(this.classNameOpen);
		}
		else {
			this.aPanels[0].el.focus();
			this.aPanels[0].elBg.style.display = 'block';
		}
		if (isDefined(oPanel.closeHandler)) {
			oPanel.closeHandler();
		}
	},

	onKeyDown: function(e) {
		var numberOfPanels = this.aPanels.length,
			keyCode = e.keyCode,
			oPanel = this.aPanels[0];
		if ((keyCode == 27 && numberOfPanels > 0 && oPanel.isCloseable) || ((keyCode == 13 || keyCode == 32) && oPanel.isEnterSpace)) {
			e.preventDefault();
			this.close(oPanel.id);
		}
	},
	
	onResize: function(e) {
		for (var i = 0, ln = this.aPanels.length; i < ln; i++) {
			if (!this.aPanels[i].isMenu) {
				var el = this.aPanels[i].el;
//				el.style.top = ((screen.height / 2 + window.scrollY) - (el.offsetHeight / 2) - this.oDefaults.offsetTop) + 'px';
				el.style.top = ((window.innerHeight / 2 + window.scrollY) - (el.offsetHeight / 2)) + 'px';
				el.style.left = ((window.innerWidth / 2 + window.scrollX) - (el.offsetWidth / 2)) + 'px';
			}
		}
	},

	onClick: function(e) {
		var oPanel = this.aPanels[0];
		for (var i = 0, ln = e.path.length; i < ln; i++) {
			if (e.path[i] == oPanel.el) {
				return;
			}
		}
		if (oPanel.isMenu) {
			window.removeEventListener('click', this.oHandlers.clickHandler, true);
			this.close(oPanel.id);
		}
	},
	
	getHeight: function(selector) {
		return document.querySelector(selector).offsetHeight || -1;
	},

	getPanel: function(id) {
		for (var i = 0, ln = this.aPanels.length; i < ln; i++) {
			if (this.aPanels[i].id == id) {
				return this.aPanels[i];
			}
		}
		return undefined;
	},
	
	removePanel: function(id) {
		for (var i = 0, ln = this.aPanels.length; i < ln; i++) {
			if (this.aPanels[i].id == id) {
				return this.aPanels.splice(i, 1);
			}
		}
		return undefined;
	}
});

//----------------------------------------------------------------------------------------------------------------------------------------------
Extend('oApp.core', {
	errorMessage: function(msg, handler) {
		oApp.core.panel.open({
			isCloseable: true,
			isEnterSpace: true,
			tpl: tplCompile(this.tpl.error_panel, {message: msg}),
			closeHandler: handler
		});
	}
});

//----------------------------------------------------------------------------------------------------------------------------------------------
Extend('oApp.core.tooltip', {
	el: null,
	
	handler: function(e) {
		var target = e.target;
		var tooltipText = target.getAttribute('data-tooltip') || target.parentElement.getAttribute('data-tooltip');
		
		if (!tooltipText) {
			return;
		}
		
		if (e.type == 'mouseover') {
			if (!this.el) {
				this.el = document.createElement('div');
				this.el.className = 'ak_tooltip_box';
				document.body.appendChild(this.el);
			}
			this.el.innerHTML = tooltipText;
			this.el.style.display = 'block';
			var coords = target.getBoundingClientRect(),
				left = coords.left  + (target.offsetWidth - this.el.offsetWidth) / 2,
				top = (coords.top + window.scrollY - this.el.offsetHeight) - 1;
			this.el.style.left = (left < 0 ? 0 : left) + 'px';
			this.el.style.top = (top < 0 ? coords.top + target.offsetHeight + 5 : top) + 'px';
		}
		
		if (e.type == 'mouseout') {
			if (this.el) {
				this.el.style.display = 'none';
			}
		}
	}
});
//----------------------------------------------------------------------------------------------------------------------------------------------
Extend('oApp.core.tooltipgift', {
	el: null,
	
	handler: function(e) {
		var target = e.target;
		var tooltipText = target.getAttribute('data-tooltip') || target.parentElement.getAttribute('data-tooltip');
		
		if (!tooltipText) {
			return;
		}
		
		if (e.type == 'mouseover') {
			if (!this.el) {
				this.el = document.createElement('div');
				this.el.className = 'ak_tooltip_box_action';
				document.body.appendChild(this.el);
			}
			this.el.innerHTML = tooltipText;
			this.el.insertAdjacentHTML('beforeend',"<div class='ak_panel_btn_close' onclick=\"oApp.core.tooltipgift.close('ak_tooltip_box_action')\"></div>");
			this.el.style.display = 'block';
			var coords = target.getBoundingClientRect(),
				left = coords.left  + (target.offsetWidth - this.el.offsetWidth) / 2,
				top = (coords.top + window.scrollY - this.el.offsetHeight) - 1;
			this.el.style.left = (left < 0 ? 0 : left) + 'px';
			this.el.style.top = (top < 0 ? coords.top + target.offsetHeight + 5 : top) + 'px';
		}
		document.addEventListener('keydown', function(event) { 
			if(event.code == 'Escape') {document.querySelector('.ak_tooltip_box_action').style.display = 'none';}
		});
		var div = document.querySelector('.ak_tooltip_box_action');
		document.addEventListener( 'click', (e) => {
			const withinBoundaries = e.composedPath().includes(div);
 
			if ( ! withinBoundaries ) {
			div.style.display = 'none'; // скрываем элемент т к клик был за его пределами
			}
		});
		
		if (e.type == 'mouseout') {
			if (this.el) {
				this.el.style.display = 'none';
			}
		}
	},
	
	close: function(el) {
		this.el.style.display = 'none';
		document.addEventListener('Escape', function(event) { 
			//if(event.code == 'Escape') {this.el.style.display = 'none';}
			console.log(event)
		});
			
		
	},
});
//----------------------------------------------------------------------------------------------------------------------------------------------
Extend('oApp.core.Sliders', {
	oIntervals: {},
	
	next: function(id) {
		var next = document.querySelector('#' + id + ' .ak_slider_chk:checked').dataset.next;
		getById(id + '_' +  next).checked = true;
	},
	
	reset: function(id, interval) {
		clearInterval(this.oIntervals[id]);
		this.oIntervals[id] = setInterval(this.next.bind(this), interval, id);
	},
		
	init: function() {
		var ak_sliders = document.getElementsByClassName('ak_slider');
		for (var i = 0, ln = ak_sliders.length; i < ln; i++) {
			var id = ak_sliders[i].id;
			var interval = ak_sliders[i].dataset.interval || 5000;
			getById(id + '_0').checked = true;
			this.oIntervals[id] = setInterval(this.next.bind(this), interval, id);
			ak_sliders[i].addEventListener('click', this.reset.bind(this, id, interval));
		}
	}
});

//----------------------------------------------------------------------------------------------------------------------------------------------
Extend('oApp.core.ajax', {
	oXhr: {},

	sendForm: function(action, params) {
		var formData = new FormData();
		for (p in params) {
			formData.append(p, params[p]);
		}
		var id = action.URL + '::' + params.act;
		this.request(id, action).send(formData);
		return id;
	},

	request: function(id, action) {
		var oThis = this;
		if (('abortPrev' in action) && action.abortPrev) {
			this.abort(id);
		}
		var xhr = new XMLHttpRequest();
		
		xhr.id = id;
		xhr.open('POST', action.URL, true);
		xhr.setRequestHeader('X-Ajax-Request', '1');
		if (isDefined(action.timeout) && !!parseInt(action.timeout)) {
			xhr.timeout = action.timeout;
		}
		xhr.onreadystatechange = function() {
			if (xhr.readyState === XMLHttpRequest.DONE) {
				//console.log(oThis.oXhr[id]);
				//console.log(action);
				if (isDefined(oThis.oXhr[id].loaderTimer)) {
					clearTimeout(oThis.oXhr[id].loaderTimer);
				}
				if (isDefined(action.removeLoaderHandler) && oThis.oXhr[id].addLoaderFired) {   
					action.removeLoaderHandler();
				}
				delete oThis.oXhr[id];
			}
		};
		xhr.onload = function() {
			if (this.status == 200) {
				var response = JSON.parse(xhr.responseText);
				switch (response.status) {
					case 'RELOAD' :
						Reload();
					break;
					case 'REDIRECT' :
						Redirect(response.url);
					break;
					default :
						action.handler(response);
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
		xhr.ontimeout =	function() {
			oApp.core.errorMessage('Превышено время ожидания ответа сервера. Пожалуйста, повторите операцию позже.');
		};
		xhr.onerror = function() {
			oApp.core.errorMessage('Не удалось получить данные с сервера. Пожалуйста, повторите операцию позже.');
		};
		if (isDefined(action.addLoaderHandler)) {   
			xhr.loaderTimer = setTimeout((function() {
				action.addLoaderHandler();
				this.addLoaderFired = true;
			}).bind(xhr), 250);
		}
		this.oXhr[id] = xhr;
		return xhr;
	},
	
	abort: function(id) {
		if (isDefined(this.oXhr[id])) {
			this.oXhr[id].abort();
			delete this.oXhr[id];
		}
	}
});

//----------------------------------------------------------------------------------------------------------------------------------------------
Extend('oApp.core.dropdown', {
	showClass: 'ak_dropdown_show',

	show: function(el) {
	  var id = el.dataset.dropdownId;
	  if (!getById(id).classList.contains(this.showClass)) {
			getById(id).classList.add(this.showClass);
		}
	},

	toggle: function(el) {
	  var id = el.dataset.dropdownId;
		getById(id).classList.toggle(this.showClass);
	},

	hideAll: function(e) {
		var aEl = document.getElementsByClassName('ak_dropdown_blk ' + this.showClass);
		for (var i = 0, ln = aEl.length; i < ln; i++) {
			if (!(isDefined(e.target.dataset.dropdownId) && e.target.dataset.dropdownId == aEl[i].id)) {
				aEl[i].classList.remove(this.showClass);
			}
			/*esc закрывать окно*/
			window.addEventListener("keydown", function(e){
					if (e.keyCode == 27) {
						aEl[0].classList.remove('ak_dropdown_show');
					}
				}, true);
		}
			
				
	}
});

onLoad(function() {
	document.addEventListener('click', oApp.core.dropdown.hideAll.bind(oApp.core.dropdown), false);
});

//----------------------------------------------------------------------------------------------------------------------------------------------
Extend('oApp.core.pageInWin', {
	open: function(url, p) {
		oApp.core.ajax.sendForm(
			{
				URL: url,
				abortPrev: true,
				handler: function(response) {
					if (response.status == 'OK') {
						oApp.core.panel.open(response.config);
						if (response.js.length > 0) {
							var el = oApp.core.panel.getPanel(response.config.panelId).el;
							if (isDefined(response.js_inline)) {
								loadScriptTxt(response.js_inline, el, null);
							}
							for (var i = 0, ln = response.js.length; i < ln; i++) {
								loadScriptUrl(response.js[i], el, null);
							}
						}
					}
					else if (response.status == 'ERROR') {
						oApp.core.errorMessage(response.message);
					}
				}
			}, Apply({act: 'open'}, p)
		);
	}
});
