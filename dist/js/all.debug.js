class HpvCheckListError extends Error {
	constructor(message) {
		super(message);
		this.name = 'HpvCheckListError';
	}
};

class HpvCheckList {
	constructor(containerId, options = {}) {
		this.defaultOptions = {
			searchPlaceholder: "Search options...",
			selectAllMainText: "Select All Visible",
			selectAllGroupText: "Select All",
			clearSearchTooltip: "Clear Search",
			emptyText: "No items available",
			disabledText: "This item is disabled",
			defaultOptGroupText: "Default",
			selectMode: 'multiple',
			maxSelectableItems: 1000,
			states: [0, 1], // from 0 to 4
			onSelect: null,
			onDeselect: null,
			onSelectAll: null,
			onDeselectAll: null,
			onSelectGroup: null,
			onDeselectGroup: null,
			onCollapseGroup: null,
			onExpandGroup: null,
			onLocalSearchResult: null,
			onSearchInputDelay: null,
			onSearchInput: null,
			onClearSearch: null,
			onExclusionModeChange: null,
			items: [],
			disabledClass: 'hpv-checklist-disabled',
			fieldMap: {
				keyField: 'id',
				labelField: 'label',
				valueField: 'value',
				optgroupField: 'optgroup',
				disabledField: 'disabled',
			},
		};

		this.options = {
			...this.defaultOptions,
			...options
		};
		this.container = document.getElementById(containerId);
		this.containerId = containerId;

		// Initialize sub-modules
		this.ui = new UIModule(this);
		this.search = new SearchModule(this);
		this.items = new ItemsModule(this);
	}

	// global proxy for modules
	addItems(userItems) {
		if (!userItems || Array.isArray(userItems) === false) {
			throw new HpvCheckListError('Invalid items format');
		}

		this.items.addMultiple(userItems);
		this.ui.afterAddOrRemoveItems();
	}

	// global proxy for modules
	addItem(item, fireAfterChange = true) {
		if (!item || typeof item !== 'object') {
			throw new HpvCheckListError('Invalid item format');
		}

		this.items.add(item);

		if (fireAfterChange) {
			this.ui.afterAddOrRemoveItems();
		}
	}

	removeItem(id) {
		const item = this.items.items.get(id);

		if (item && item.el) {
			item.hiddenBySelection = true;
			item.el.classList.add('fade-out');
			setTimeout(() => {
				this.items.remove(id);
				this.ui.afterAddOrRemoveItems();
			}, 300); // Match this with the CSS transition duration
		}
	}

	removeAllItems() {
		// we wont clear items, only delete el, keeping previous selected items on list
		this.items.removeAll();

		this.ui.afterAddOrRemoveItems();
	}

	// checkItem(id, check = true) {
	//     const item = this.items.items.get(id);
	//     // Do not allow to change disabled items
	//     if ( item.nativeDisabled ) return;

	//     if (item) {
	//         item.value = check ? 1 : 0;
	//         this.items.items.set(id, item);
	//         // render items
	//         this.updateItemStates();
	//     } else {
	//         console.warn(`Item with id "${id}" not found`);
	//     }
	// }

	setItemVisibility(id, attr, visible) {
		const item = this.items.items.get(id);
		if (item) {
			item[attr] = visible;
			this.items.items.set(id, item);

			// style
			item.el.style.display = visible ? '' : 'none';
		}
	}

	renderItems() {
		const {
			defaultOptGroupText,
			selectMode,
			selectAllGroupText,
			disabledClass
		} = this.options;

		const fragment = document.createDocumentFragment();
		const checkboxList = this.container.querySelector('.hpv-checklist-checkbox-list');
		checkboxList.innerHTML = '';

		const groupedItems = this.items.getGroupedItems();
		// count unique names in groupedItems.optgroup
		const numberOfGroups = this.items.getGroupNames()
			.length;

		for (const [groupName, items] of Object.entries(groupedItems)) {
			if (groupName == defaultOptGroupText && numberOfGroups == 1) {
				// hide group name if only one group
				// plot an hr to separate items
				const hr = document.createElement('hr');
				hr.className = 'hr-no-optgroups';
				fragment.appendChild(hr);
			} else {
				const optgroup = document.createElement('div');
				optgroup.className = 'optgroup';
				optgroup.innerHTML = `
					<span>${groupName}</span>
					<button class="select-all-group ${selectMode == 'single' ? 'select-single-mode' : ''}">${selectAllGroupText}</button>
				`;

				optgroup.setAttribute('group-name', groupName);

				fragment.appendChild(optgroup);
			}

			const ul = document.createElement('ul');
			items.forEach((item) => {
				const li = document.createElement('li');
				li.className = item.disabled ? disabledClass : '';
				li.innerHTML = `
					<div class="custom-checkbox" id="${item.key}" ${item.disabled ? 'data-disabled' : ''} ${item.checkedInclusion ? 'data-checked' : ''}>
						<div class="checkbox-inner"></div>
					</div>
					<div class="checkbox-label">${item.label}</div>
				`;
				ul.appendChild(li);

				item.el = li;
			});
			fragment.appendChild(ul);
		}

		checkboxList.appendChild(fragment);
	}

	// set attributes that css will use to style the items
	updateItemStates() {
		this.items.items.forEach((item, id) => {
			if (!item.el) return;

			const itemContainer = item.el;
			const customCheckbox = itemContainer.querySelector('.custom-checkbox');
			const label = itemContainer.querySelector('.checkbox-label');
			const isNativeDisabled = item.nativeDisabled;

			customCheckbox.setAttribute('data-checked', item.value !== this.options.states[0] ? 'true' : 'false');
			customCheckbox.setAttribute('data-state', item.value.toString());

			if (isNativeDisabled) {
				customCheckbox.setAttribute('data-disabled', 'true');
			} else {
				customCheckbox.removeAttribute('data-disabled');
			}

			itemContainer.classList.toggle(this.options.disabledClass, isNativeDisabled);

			if (customCheckbox.hasAttribute('data-disabled')) {
				label.title = isNativeDisabled ? this.options.disabledText : '';
			} else {
				label.title = '';
			}
		});
	}

	setupItemsEventListeners() {
		this.setupCollapsibleOptgroups();
		this.setupClickableListItems();
	}

	itemMatchesFilter(item, lowerFilter) {
		return item.label.toLowerCase()
			.includes(lowerFilter) ||
			item.optgroup.toLowerCase()
			.includes(lowerFilter);
	}

	setupCollapsibleOptgroups() {
		const optgroups = this.container.querySelectorAll('.optgroup');
		for (let group of optgroups) {
			const groupName = this.getGroupName(group);

			group.addEventListener('click', (e) => {
				if (e.target.tagName.toLowerCase() === 'button') return;
				const isCollapsing = !group.classList.contains('collapsed');
				group.classList.toggle('collapsed');
				const ul = group.nextElementSibling;
				if (ul.tagName.toLowerCase() === 'ul') {
					ul.style.display = isCollapsing ? 'none' : '';
				}
				const selectAllBtn = group.querySelector('.select-all-group');
				selectAllBtn.style.visibility = isCollapsing ? 'hidden' : 'visible';

				if (isCollapsing && this.options.onCollapseGroup) {
					this.options.onCollapseGroup(this, groupName, group, this.getItemsByGroup(groupName));
				} else if (!isCollapsing && this.options.onExpandGroup) {
					this.options.onExpandGroup(this, groupName, group, this.getItemsByGroup(groupName));
				}
			});
		}
	}

	setupClickableListItems() {
		const listItems = this.container.querySelectorAll('li');
		listItems.forEach(item => {
			item.addEventListener('click', (e) => {
				const customCheckbox = item.querySelector('.custom-checkbox');
				if (!customCheckbox.hasAttribute('data-disabled')) {
					this.toggleItemSelection(customCheckbox.id);
					e.preventDefault();
				}
			});
		});
	}

	toggleItemSelection(id) {
		const item = this.items.items.get(id);
		if (!item || item.nativeDisabled) return;

		const currentStateIndex = this.options.states.indexOf(item.value);
		const nextStateIndex = (currentStateIndex + 1) % this.options.states.length;
		item.value = this.options.states[nextStateIndex];

		if (this.options.selectMode === 'single') {
			this.items.items.forEach((otherItem, otherId) => {
				if (otherId !== id) {
					otherItem.value = this.options.states[0]; // First state is always unselected
				}
			});
		}

		this.updateItemStates();

		if (item.value !== this.options.states[0] && this.options.onSelect) {
			this.options.onSelect(this, id, item);
		} else if (item.value === this.options.states[0] && this.options.onDeselect) {
			this.options.onDeselect(this, id, item);
		}
	}

	getItemsByGroup(groupName) {
		// find in this.items items where item.optgroup = groupName
		return Array.from(this.items.items.values())
			.filter(item => item.optgroup === groupName);
	}

	getGroupName(groupEl) {
		return groupEl.getAttribute('group-name');
	}

	selectAllGroup(button) {
		if (this.options.selectMode === 'single') return;

		const group = button.closest('.optgroup');
		const groupName = this.getGroupName(group);
		const items = this.getItemsByGroup(groupName);
		const newValue = this.goToNextState(items);

		if (newValue !== this.options.states[0] && this.options.onSelectGroup) {
			this.options.onSelectGroup(this, groupName, group, items);
		} else if (newValue === this.options.states[0] && this.options.onDeselectGroup) {
			this.options.onDeselectGroup(this, groupName, group, items);
		}
	}

	goToNextState(items) {
		const currentState = this.getItemsState(items);
		const nextStateIndex = (this.options.states.indexOf(currentState) + 1) % this.options.states.length;
		const newValue = this.options.states[nextStateIndex];

		items.forEach(item => {
			if (!item.nativeDisabled) {
				item.value = newValue;
			}
		});

		this.updateItemStates();

		return newValue;
	}

	// determine the state of the items
	getItemsState(items) {
		const states = items
			.filter(item => !item.nativeDisabled)
			.map(item => item.value);

		if (states.every(state => state === states[0])) {
			return states[0];
		}
		return this.options.states[0]; // Default to first state if mixed
	}

	selectAllMain() {
		if (this.options.selectMode === 'single') return;

		const visibleItemsWithoutDisabled = this.items.getVisibleItems(false);
		const newValue = this.goToNextState(visibleItemsWithoutDisabled);

		if (newValue > 0 && this.options.onSelectAll) {
			this.options.onSelectAll(this, visibleItemsWithoutDisabled);
		} else if (newValue === 0 && this.options.onDeselectAll) {
			this.options.onDeselectAll(this, visibleItemsWithoutDisabled);
		}
	}
};

class ItemsModule {
	constructor(p) {
		if (!(p instanceof HpvCheckList)) {
			throw new HpvCheckListError('Parent must be an instance of HpvCheckList');
		}

		this.parent = p;
		this.items = new Map(); // Store all items { id, el, internal } with their states
	}

	getVisibleItems(includeDisabled = true) {
		// return all items where item.visibleAfterSearch = true and item.disabled = false
		return Array.from(this.items.entries())
			.filter(([_, item]) => item.visibleAfterSearch && (includeDisabled || !item.nativeDisabled))
			.map(([_, item]) => item);
	}

	// to item module
	getSelectedItems() {
		// list all entries from this.items where (item.value > 0)
		return Array.from(this.items.entries())
			.filter(([_, item]) => item.value > 0)
			.map(([_, item]) => item);
	}

	// to item module
	getSelectedIds() {
		return Array.from(this.items.entries())
			.filter(([_, item]) => item.value > 0)
			.map(([id, _]) => id);
	}

	getGroupNames() {
		// return all unique optgroup values
		return Array.from(new Set(Array.from(this.items.values())
			.map(item => item.optgroup)));
	}

	addMultiple(userItems) {
		userItems.forEach(item => this.add(item, false));
	}

	add(item, fireAfterChange = true) {
		const {
			defaultOptGroupText,
			fieldMap
		} = this.parent.options;
		const {
			keyField,
			labelField,
			valueField,
			disabledField,
			optgroupField
		} = fieldMap;

		const key = item[keyField] + ''; // protection
		const label = item[labelField];
		let value = item[valueField] || 0;
		const optgroup = item[optgroupField] || defaultOptGroupText;
		const disabled = item[disabledField] || false;

		// Ensure the value is within the allowed states
		if (!this.parent.options.states.includes(value)) {
			value = this.parent.options.states[0]; // Default to the first state if not found
		}

		this.items.set(key, {
			key: key,
			label: label,
			value: value,
			optgroup: optgroup,
			disabled: disabled,
			// internal
			nativeDisabled: disabled,
			visibleAfterSearch: true,
		});

		if (fireAfterChange) {
			this.parent.ui.afterAddOrRemoveItems();
		}
	}

	remove(id) {
		if (this.items.has(id)) {
			this.items.delete(id);
			return true;
		}

		return false;
	}

	removeAll(keepSelectedStates = true) {
		// NOTE: will we really remove all items or delete el from DOM?
		this.items.clear();
	}

	getGroupedItems() {
		const groups = {};

		this.items.forEach(item => {
			if (!groups[item.optgroup]) {
				groups[item.optgroup] = [];
			}
			groups[item.optgroup].push(item);
		});

		return groups;
	}

	getSize() {
		return this.items.size;
	}
};

class SearchModule {
	constructor(p) {
		if (!(p instanceof HpvCheckList)) {
			throw new HpvCheckListError('Parent must be an instance of HpvCheckList');
		}

		this.parent = p;
		this.timeout = null;
		this.setupSearchInput();
		this.setupClearSearchButton();
		this.setupSearchInputShortcut();
	}

	setupSearchInput() {
		const searchInput = this.parent.container.querySelector('.search-input');

		searchInput.addEventListener('input', () => {
			const value = searchInput.value;
			const selectedItems = this.parent.items.getSelectedItems();

			if (this.parent.options.onSearchInputDelay) {
				clearTimeout(this.timeout);

				this.timeout = setTimeout(() => {
					this.parent.options.onSearchInputDelay(value, selectedItems);
				}, 200);
			}

			if (this.parent.options.onSearchInput) {
				this.parent.options.onSearchInput(value, selectedItems);
			}

			this.performLocalSearch(value);
		});
	}

	setupClearSearchButton() {
		const clearButton = this.parent.container.querySelector('.clear-search');
		clearButton.addEventListener('click', () => this.clearSearch());
	}

	setupSearchInputShortcut() {
		const searchInput = this.parent.container.querySelector('.search-input');
		searchInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();

				if (e.shiftKey && this.parent.options.states.includes(2)) {
					this.toggleVisibleItems(2);
				} else {
					this.toggleVisibleItems(1);
				}
				this.clearSearch();
			}
		});
	}

	toggleVisibleItems(targetState) {
		const visibleItems = Array.from(this.parent.items.items.entries())
			.filter(([_, item]) => item.visibleAfterSearch && !item.nativeDisabled);

		const allInTargetState = visibleItems.every(([_, item]) => item.value === targetState);

		const newState = allInTargetState ? this.parent.options.states[0] : targetState;

		visibleItems.forEach(([id, item]) => {
			this.parent.items.items.get(id)
				.value = newState;
		});

		this.parent.updateItemStates();

		if (newState === this.parent.options.states[0]) {
			if (this.parent.options.onDeselectAll) {
				this.parent.options.onDeselectAll(
					this.parent,
					visibleItems,
				);
			}
		} else {
			if (this.parent.options.onSelectAll) {
				this.parent.options.onSelectAll(
					this.parent,
					visibleItems,
				);
			}
		}
	}

	clearSearch() {
		const searchInput = this.parent.container.querySelector('.search-input');
		searchInput.value = '';
		searchInput.dispatchEvent(new Event('input'));
		if (this.parent.options.onClearSearch) {
			this.parent.options.onClearSearch(this.parent.items.getSelectedItems());
		}
	}

	performLocalSearch(filter) {
		const lowerFilter = filter.toLowerCase();
		const optgroups = this.parent.container.querySelectorAll('.optgroup');
		let visibleItemsCount = 0;

		this.parent.items.items.forEach((item, id) => {
			const visible = this.parent.itemMatchesFilter(item, lowerFilter);
			this.parent.setItemVisibility(id, 'visibleAfterSearch', visible);
			if (visible) visibleItemsCount++;
		});

		optgroups.forEach(group => {
			const groupName = group.getAttribute('group-name');
			const groupItems = this.parent.getItemsByGroup(groupName);
			const visibleGroupItems = groupItems.filter(item => item.visibleAfterSearch);

			if (visibleGroupItems.length > 0 || groupName.toLowerCase()
				.includes(lowerFilter)) {
				group.style.display = '';
				group.classList.remove('collapsed');
				const ul = group.nextElementSibling;
				if (ul && ul.tagName.toLowerCase() === 'ul') {
					ul.style.display = '';
				}
			} else {
				group.style.display = 'none';
			}
		});

		if (visibleItemsCount === 0) {
			this.parent.ui.showEmptyStatus();
		} else {
			this.parent.ui.hideStatus();
		}

		if (this.parent.options.onLocalSearchResult) {
			this.parent.options.onLocalSearchResult(filter, this.parent.items.getSelectedItems());
		}
	}
};

class UIModule {
	constructor(p) {
		if (!(p instanceof HpvCheckList)) {
			throw new HpvCheckListError('Parent must be an instance of HpvCheckList');
		}

		this.parent = p;
		this.createDropdownContainer();
		// select all button and group buttons ( by Event Target )
		this.setupSelectAllButtons();
	}

	afterAddOrRemoveItems() {
		if (this.parent.items.getSize() == 0) {
			this.showCustomStatus(this.parent.options.emptyText);
		} else {
			this.hideStatus();
		}

		// only when items are added after init
		this.parent.renderItems();
		this.parent.setupItemsEventListeners();
		this.parent.updateItemStates();
	}

	showEmptyStatus() {
		this.showCustomStatus(this.parent.options.emptyText);
	}

	showCustomStatus(htmlContent) {
		const statusContainer = this.parent.container.querySelector('.hpv-checklist-status-container');
		statusContainer.querySelector('span')
			.innerHTML = htmlContent;
		statusContainer.style.display = 'flex';
	}

	hideStatus() {
		this.parent.container.querySelector('.hpv-checklist-status-container')
			.style.display = 'none';
	}

	setupSelectAllButtons() {
		this.parent.container.addEventListener('click', (e) => {
			if (e.target.matches('.select-all-group')) {
				this.parent.selectAllGroup(e.target);
			} else if (e.target.matches('.select-all-main')) {
				this.parent.selectAllMain();
			}
		});
	}

	createDropdownContainer() {
		// set class hpv-checklist to this.container
		this.parent.container.classList.add('hpv-checklist');
		const {
			searchPlaceholder,
			clearSearchTooltip,
			selectAllMainText,
			emptyText,
			selectMode
		} = this.parent.options;

		const dropdownHTML = `
			<div class="search-container">
				<input type="text" class="search-input" placeholder="${searchPlaceholder}">
				<button class="clear-search" title="${clearSearchTooltip}">&times;</button>
			</div>
			<div class="hpv-checklist-content">
				<div class="hpv-checklist-btn-group">
					<button class="select-all-main ${selectMode == 'single' ? 'select-single-mode' : ''}">${selectAllMainText}</button>
				</div>
				<div class="hpv-checklist-status-container">
					<span>${emptyText}</span>    
				</div>
				<div class="hpv-checklist-checkbox-list"></div>
			</div>
		`;

		// Append the HTML to the desired parent element
		this.parent.container.innerHTML += dropdownHTML;
	}
};