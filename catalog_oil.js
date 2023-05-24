Extend('oApp.oCatalogOil', {
	filterSelected: {},
	sSortCol: 'brand_name',
	bSortAsc: true,
	iShownItems: 5,
	iMaxShowItems: 7,
	filterOrder: ['brand', 'tenacity', 'volume', 'program'],
	aCols: [
		{id: 'part_code', name: 'Артикул', hcls: 'part_code_col'},
		{id: 'brand_name', name: 'Бренд', hcls: 'brand_name_col'},
		{id: 'part_descr', name: 'Наименование', cls: 'part_descr_cell'},
		{id: 'tenacity', name: 'Вязкость', hcls: 'tenacity_col'},
		{id: 'volume', name: 'Объем (л)', hcls: 'volume_col'},
		{id: 'program', name: 'Программа', hcls: 'program_col'},
		{id: 'quantity', name: 'Наличие', hcls: 'quantity_col'}
	],
	
	compileFilters: function() {
		var data = oApp.core.sessionStorage.get(this.url + '::filters');
		if (!!data) {
			this.filterSelected = data;
		}
		if (!isDefined(this.filterSelected.available)) {
			this.filterSelected.available = true;
		}
		getById('available_item').checked = this.filterSelected.available;
		var aFilters = [];
		for (var i = 0, lni = this.filterOrder.length; i < lni; i++) {
			var sFilterName = this.filterOrder[i];
			if (!isDefined(this.filterSelected[sFilterName])) {
				this.filterSelected[sFilterName] = [];
			}
			var oFilter = this.filters[sFilterName];
			var aFilter = [];

			if (sFilterName == 'volume') {
				oFilter.values.sort(function(a, b) {
					var re = /,/g,
						v1 = a.name.replace(re, '.'),
						v2 = b.name.replace(re, '.');
					return v1 - v2;	
				});
			}
			else if (sFilterName == 'tenacity') {
				oFilter.values.sort(function(a, b) {
					var re = /[^\d]/g,
						v1 = a.name.replace(re, ''),
						v2 = b.name.replace(re, '');
					return v1 - v2;
				});
			}

			var bFilterValues = !!this.filterSelected[sFilterName].length;
			var bShowOthers = false;
			for (var j = 0, lnj = oFilter.values.length; j < lnj; j++) {
				if (j == this.iShownItems && lnj > this.iMaxShowItems) {
					aFilter.push(tplCompile(this.tpl.others_open, {
						visibility: (bFilterValues ? 'show' : '')
					}));
					bShowOthers = true;
				}
				oFilter.values[j].name = this.formatFilterValue(sFilterName, oFilter.values[j].name);
				var idx = this.filterSelected[sFilterName].indexOf(oFilter.values[j].id);
				aFilter.push(tplCompile(this.tpl.filter_row, Apply(oFilter.values[j], {
					filter_name: sFilterName,
					filter_cnt_name: (sFilterName == 'brand' ? sFilterName : 'filter'),
					checked: (idx >= 0 ? 'checked' : ''),
					ns: this.ns
				})));
			}
			var sCollapsed = 'collapsed';
			var sVisibility = '';
			if (sFilterName === this.filterOrder[0] || bFilterValues) {
				sCollapsed = ''; 
				sVisibility = 'show';
			}
			if (bShowOthers) {
				aFilter.push(
					this.tpl.others_close,
					tplCompile(this.tpl.toggle_link, {
						name: (bFilterValues ? this.tpl.toggle_link_hide : this.tpl.toggle_link_show),
						ns: this.ns
					})
				);
			}
			aFilters.push(tplCompile(this.tpl.filter_block, {
				filter_rows: aFilter.join(''),
				filter_name: sFilterName,
				filter_descr: oFilter.name,
				collapsed: sCollapsed,
				visibility: sVisibility,
				ns: this.ns
			}));
		}
		setHTML('filters_block', aFilters.join(''));
		this.getParts();
	},
	
	applyFilter: function(filterName, id, isChecked) {
		if (isChecked) {
			this.filterSelected[filterName].push(id);
		}
		else {
			var index = this.filterSelected[filterName].indexOf(id);
			if (index >= 0) {
				this.filterSelected[filterName].splice(index, 1);
			} 
		}
		this.getParts();
	},

	setAvailable: function(checked) {
		this.filterSelected.available = checked;
		this.getParts();
	},

	saveFilters: function() {
		oApp.core.sessionStorage.set(this.url + '::filters', this.filterSelected);
	},

	resetFilter: function(sFilterName) {
		var values = this.filterSelected[sFilterName];
		for (var i = 0, lni = values.length; i < lni; i++) {
			getById(sFilterName + '_' + values[i]).checked = false;
		}
		this.filterSelected[sFilterName] = [];
		this.getParts();
	},

	resetAllFilters: function() {
		for (var sFilterName in this.filterSelected) {
			if (sFilterName == 'available') {
				getById('available_item').checked = true;
				this.filterSelected[sFilterName] = true;
			}
			else {
				var values = this.filterSelected[sFilterName];
				for (var i = 0, lni = values.length; i < lni; i++) {
					getById(sFilterName + '_' + values[i]).checked = false;
				}
				this.filterSelected[sFilterName] = [];
			}
		}
		oApp.core.sessionStorage.del(this.url + '::filters');
		this.getParts();
	},
	
	compileParts: function(data) {
		var partCount = {
			brand: {},
			filter: {}
		};
		
		var aHeaderRow = [];
		var aPartRowTpl = [];
		for (var i = 0, ln = this.aCols.length; i < ln; i++) {
			var aCls = [];
			var oCol = this.aCols[i];
			if (isDefined(oCol.hcls)) {
				aCls.push(oCol.hcls);
			}
			if (oCol.id == this.sSortCol) {
				aCls.push('sorted', this.bSortAsc ? 'ask' : 'desc');
			}
			else {
				aCls.push('non_sorted');
			}
			aHeaderRow.push(tplCompile(this.tpl.header_col, Apply(oCol, {class: aCls.join(' ')})));
			aPartRowTpl.push(tplCompile(this.tpl.part_col, oCol));
		}

		var aPartsTemplate = [];
		for (var i = 0, ln = data.length; i < ln; i++) {
			var oData = data[i];
			if (!isDefined(partCount.brand[oData.brand_id])) {
				partCount.brand[oData.brand_id] = 1;
			}
			else {
				partCount.brand[oData.brand_id]++;
			}
			for (var id of oData.data_index.split(',')) {
				if (!isDefined(partCount.filter[id])) {
					partCount.filter[id] = 1;
				}
				else {
					partCount.filter[id]++;
				}
			}
			for (var fieldName in oData) {
				oData[fieldName] = this.formatFilterValue(fieldName, oData[fieldName]);
			}
			
			aPartsTemplate.push(tplCompile(this.tpl.part_row, {
				part_id: oData.part_id,
				ns: this.ns,
				part_row: tplCompile(aPartRowTpl.join(''), Apply(oData, {
					quantity: this.tpl['qty_' + oData.quantity],
				})) 
			}));
		}
		for (var i = 0, lni = this.filterOrder.length; i < lni; i++) {
			var sFilterName = this.filterOrder[i];
			var filterCntName = (sFilterName == 'brand' ? sFilterName : 'filter');
			var filterValues = this.filters[sFilterName].values;
			for (var j = 0, lnj = filterValues.length; j < lnj; j++) {
				var id = filterValues[j].id;
				setHTML(filterCntName + '_' + id +'_cnt', partCount[filterCntName][filterValues[j].id] || '');
			}
		}
		
		if (aPartsTemplate.length) {
			setHTML('empty', '');
		}
		else {
			setHTML('empty', tplCompile(this.tpl.empty, {col: this.aCols.length + 1}));
		}
		aPartsTemplate.unshift(tplCompile(this.tpl.header_row, {ns: this.ns, header_row: aHeaderRow.join('')}));
		setHTML('result', aPartsTemplate.join(''));
	},
	
	getParts: function() {
		var oThis = this;
		var oFilters = {};
		for (var i = 0, ln = this.filterOrder.length; i < ln; i++) {
			var sFilterName = this.filterOrder[i];
			oFilters[sFilterName] = this.filterSelected[sFilterName].join(',');
		}
		oApp.core.ajax.sendForm(
			{
				URL: this.url,
				addLoaderHandler: function() {
					getById('content').classList.add('preloader');
				},
				removeLoaderHandler: function() {
					getById('content').classList.remove('preloader');
				},
				handler: function(response) {
					if (response.status == 'OK') {
						oThis.compileParts(response.data);
					}
					else if (response.status == 'ERROR') {
						oApp.core.errorMessage(response.message);
					}
				}
			},
			Apply(oFilters, {
				act: 'filtrate',
				available: this.filterSelected['available'],
				sort_field: this.sSortCol,
				sort_asc: this.bSortAsc
			})
		);
	},

	colSort: function(e) {
		var el = e.target;
		if (isDefined(el.dataset.id)) {
			if (this.sSortCol == el.dataset.id) {
				this.bSortAsc = !this.bSortAsc;
			}
			else {
				this.sSortCol = el.dataset.id;
				this.bSortAsc = true;
			}
			this.getParts();
		}
	},
	
	selectPart: function(id, e) {
		var el = e.target;
		if (el.classList.contains('part_info_cell')) {
			oApp.core.pageInWin.open('/part.php', {part_id: id});
		}
		else {
			Redirect(getQueryUrl('/search.php', {part_id: id, src: 'lock'}));
		}
	},
	
	doFilterToggle: function(el) {
		var wrap = el.parentNode.querySelector('.filter_wrap');
		if (el.classList.contains('collapsed')) {
			el.classList.remove('collapsed');
			wrap.classList.add('show')
		}
		else {
			el.classList.add('collapsed');
			wrap.classList.remove('show');
		}
	},
	
	doOthersToggle: function(el) {
		var others_wrap = el.parentNode.querySelector('.others_block');
		if (others_wrap.classList.contains('show')) {
			others_wrap.classList.remove('show');
			el.textContent = this.tpl.toggle_link_show;
		}
		else {
			others_wrap.classList.add('show');
			el.textContent = this.tpl.toggle_link_hide;
		}
	},
	
	formatFilterValue: function(name, val) {
		return val;
	}
});

onLoad(oApp.oCatalogOil.compileFilters.bind(oApp.oCatalogOil));
onBeforeUnload(oApp.oCatalogOil.saveFilters.bind(oApp.oCatalogOil));
