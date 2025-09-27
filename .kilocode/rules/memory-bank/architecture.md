# HPV-CHECKLIST - System Architecture

## System Architecture
The HPV-CHECKLIST library follows a modular architecture with three main components:

### Core Classes
1. **HpvCheckList** - Main controller class
2. **HpvCheckListItemsModule** - Handles item management and data operations
3. **HpvChecklistSearchModule** - Manages search functionality
4. **HpvCheckListUIModule** - Handles DOM manipulation and UI updates

### Source Code Paths
- `src/js/checklist.js` - Main implementation file containing all classes
- `src/css/checklist.css` - Styling for the component
- `gulpfile.js` - Build system configuration
- `gulp/js.js` - JavaScript build tasks
- `gulp/css.js` - CSS build tasks

### Key Technical Decisions
1. **Vanilla JavaScript Only**: No external dependencies for maximum compatibility
2. **Class-based Architecture**: Modular design with separate concerns
3. **Map-based Storage**: Efficient item storage using JavaScript Map
4. **Event-driven Updates**: DOM updates triggered by user interactions
5. **CSS-first Styling**: Behavior controlled through CSS classes and data attributes

### Design Patterns in Use
1. **Module Pattern**: Each functionality separated into modules
2. **Observer Pattern**: Callbacks for user interactions
3. **Factory Pattern**: Item creation and management
4. **Singleton Pattern**: Single instance per container

### Component Relationships
```
HpvCheckList (Main Controller)
├── HpvCheckListItemsModule (Data Management)
├── HpvChecklistSearchModule (Search Functionality)
└── HpvCheckListUIModule (DOM Manipulation)
```

### Critical Implementation Paths
1. **Initialization**: Container setup → UI creation → Event binding
2. **Item Management**: Add/Remove → DOM update → State synchronization
3. **Search**: Input → Filter → Visibility update → UI refresh
4. **Selection**: Click → State change → Callback → UI update
5. **Build Process**: Source → Concatenate → Minify → Distribution