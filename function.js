function Apply(object, config, defaults) {
	if (defaults) {
		Apply(object, defaults);
	}
	if (object && config && typeof config === 'object') {
		for (var i in config) {
			object[i] = config[i];
		}
	}
	return object;
}

function isDefined(value) {
	return typeof value !== 'undefined';
}

function isObject(value) {
	return typeof value === '[object Object]';
}

function isEmptyObject(obj) {
	for (var name in obj) {
		return false;
	}
	return true;
}

function isArray(value) {
  return Object.prototype.toString.call(value) === '[object Array]';
}

function Extend(namespace, obj) {
	var aSlices = namespace.split('.'),
		ns = window;
	for (var i = 0, ln = aSlices.length; i < ln; i++) {
		var slice = aSlices[i];
		if (!isDefined(ns[slice])) {
			ns[slice] = {};
		}
		ns = ns[slice];
	}
	extendObj(ns, Apply(obj, {ns: namespace})); 
}

function extendObj(ns, obj) {
	for (var prop in obj) {
		if (obj.hasOwnProperty(prop)) {
			var currentProp = obj[prop];
			if (isObject(currentProp) && !isArray(currentProp)) {
				ns[prop] = ns[prop] || {};
				extendObj(ns[prop], currentProp);
			}
			else {
				ns[prop] = currentProp;
			}
		}
	}
}

function tplCompile(tpl, data) {
	return tpl.replace(/\{([\w-]+?)\}/g, function(m, name) {
		return data[name] || '';
	});
}

function Round(workNumber, precision) {
	var nM = Math.pow(10, precision || 0);
	return Math.round(workNumber * nM) / nM;
}

String.prototype.capitalize = function() {
	return this.replace(/(?:^|\s)\S/g, function(a) {return a.toUpperCase();});
};

function Reload() {
	document.location.reload();
}

function Redirect(url) {
	document.location.href = url;
}

function onLoad(fn) {
	window.addEventListener('load', fn, false);
}

function onBeforeUnload(fn) {
	window.addEventListener('beforeunload', fn, false);
}

function getById(id) {
	return document.getElementById(id);
}

function showById(id) {
	document.getElementById(id).style.display = 'block';
}

function hideById(id) {
	document.getElementById(id).style.display = 'none';
}

function setHTML(id, html) {
	document.getElementById(id).innerHTML = html;
}

function getQueryUrl(url, oData) {
	var aParams = [];
	for (var p in oData) {
		aParams.push(encodeURIComponent(p) + '=' + encodeURIComponent(oData[p]));
	}
	return url + '?' + aParams.join('&');
}

function atou(str) {
	return decodeURIComponent(escape(window.atob(str)));
}

function setCookie(name, value, expires, path) {
	document.cookie = name + '=' + escape(value) + (isDefined(expires) ? '; expires=' + expires.toUTCString() : '') + (isDefined(path) ? '; path=' + path : '');
}

function insertAfter(id, html) {
  document.getElementById(id).insertAdjacentHTML('afterEnd', html);
}

function appendInto(id, html) {
  document.getElementById(id).insertAdjacentHTML('beforeend', html);
}

function getBody() {
	return document.body;
}

var emailPattern = '[A-Za-z0-9](?:[_\\.\\-\\+]?[A-Za-z0-9]+)*@(?:[A-Za-z0-9][A-Za-z0-9\\-]*[A-Za-z0-9]\\.)+[A-Za-z]+';
function isEmails(value) {
	var re = new RegExp('^' + emailPattern + '(\\s*[,;]\\s*' + emailPattern + ')*$');
	return re.test(value.trim());
}

function loadScriptUrl(url, el, callback) {
	var script = document.createElement('script');
	script.type = 'text/javascript';
	script.src = url;
	script.async = false;
	script.onload = callback;
	el.appendChild(script);
}

function loadScriptTxt(txt, el, callback) {
	var script = document.createElement('script');
	script.type = 'text/javascript';
	script.text = txt;
	script.async = false;
	script.onload = callback;
	el.appendChild(script);
}
