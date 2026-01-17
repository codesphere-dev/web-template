# Good Practices & Engineering Principles

## Table of Contents
1. [Core Engineering Principles](#core-engineering-principles)
2. [SOLID Principles in React/TypeScript](#solid-principles-in-reacttypescript)
3. [React-Specific Best Practices](#react-specific-best-practices)
4. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
5. [Decision Trees](#decision-trees)
6. [Code Review Checklist](#code-review-checklist)

---

## Core Engineering Principles

### KISS (Keep It Simple, Stupid)

**Definition:** Write simple, straightforward code that solves the problem at hand without unnecessary complexity.

**In Practice:**

✅ **Good:**
```typescript
// Simple, readable function
const formatApplicationDate = (date: Date): string => {
  return date.toLocaleDateString('fr-FR');
};
```

❌ **Bad:**
```typescript
// Over-engineered solution
class DateFormatterFactory {
  private static instance: DateFormatterFactory;
  
  private constructor() {}
  
  static getInstance(): DateFormatterFactory {
    if (!this.instance) {
      this.instance = new DateFormatterFactory();
    }
    return this.instance;
  }
  
  createFormatter(locale: string): DateFormatter {
    return new DateFormatter(locale);
  }
}

class DateFormatter {
  constructor(private locale: string) {}
  
  format(date: Date): string {
    return date.toLocaleDateString(this.locale);
  }
}

// Usage
const formatter = DateFormatterFactory.getInstance()
  .createFormatter('fr-FR');
const formatted = formatter.format(new Date());
```

**Guidelines:**
- Prefer functions over classes when state management isn't needed
- Use built-in methods before creating custom solutions
- Question complexity: "Is there a simpler way?"

---

### YAGNI (You Aren't Gonna Need It)

**Definition:** Don't implement functionality until it's actually needed. Avoid speculative features.

**In Practice:**

✅ **Good:**
```typescript
// Only implements what's needed now
interface Application {
  id: string;
  name: string;
  status: 'pending' | 'approved' | 'rejected';
}

const ApplicationCard: React.FC<{ application: Application }> = ({ application }) => {
  return (
    <div className="application-card">
      <h3>{application.name}</h3>
      <StatusBadge status={application.status} />
    </div>
  );
};
```

❌ **Bad:**
```typescript
// Speculative features "just in case"
interface Application {
  id: string;
  name: string;
  status: 'pending' | 'approved' | 'rejected';
  // Not needed yet
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
  assignedTo?: string;
  estimatedCompletionDate?: Date;
  internalNotes?: string[];
}

const ApplicationCard: React.FC<{ 
  application: Application;
  // Props for features not yet requested
  onPriorityChange?: (priority: string) => void;
  onTagAdd?: (tag: string) => void;
  onAssign?: (userId: string) => void;
}> = ({ application, onPriorityChange, onTagAdd, onAssign }) => {
  // Complex logic for features that don't exist
  return <div>...</div>;
};
```

**Guidelines:**
- Implement features when they're actually requested
- Don't add configuration options "for flexibility" if there's only one use case
- Refactor when new requirements emerge, don't pre-engineer

---

### DRY (Don't Repeat Yourself)

**Definition:** Avoid duplicating logic, data, or knowledge across your codebase.

**In Practice:**

✅ **Good:**
```typescript
// Shared validation logic
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Reused in multiple components
const LoginForm = () => {
  const handleSubmit = (email: string) => {
    if (!validateEmail(email)) {
      setError('Email invalide');
    }
  };
  // ...
};

const RegistrationForm = () => {
  const handleSubmit = (email: string) => {
    if (!validateEmail(email)) {
      setError('Email invalide');
    }
  };
  // ...
};
```

❌ **Bad:**
```typescript
// Duplicated validation logic
const LoginForm = () => {
  const handleSubmit = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Email invalide');
    }
  };
  // ...
};

const RegistrationForm = () => {
  const handleSubmit = (email: string) => {
    // Same regex, different variable name
    const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!EMAIL_PATTERN.test(email)) {
      setError('Email invalide'); // Same error message
    }
  };
  // ...
};
```

**Balance with Over-Abstraction:**
```typescript
// ⚠️ Too DRY - premature abstraction
const createValidator = (pattern: RegExp, errorMessage: string) => {
  return (value: string) => {
    if (!pattern.test(value)) {
      throw new Error(errorMessage);
    }
  };
};

// ✅ Good balance - extract when pattern emerges 3+ times
// Keep it simple for 1-2 occurrences
```

---

### Fail-Fast vs Fail-Safe

**Fail-Fast:** Detect and report errors immediately to prevent silent failures.

✅ **Good (Fail-Fast):**
```typescript
const processApplication = (application: Application | null) => {
  if (!application) {
    throw new Error('Application cannot be null');
  }
  
  if (!application.id) {
    throw new Error('Application must have an ID');
  }
  
  // Process with confidence
  return submitApplication(application);
};
```

❌ **Bad (Silent Failure):**
```typescript
const processApplication = (application: Application | null) => {
  // Silently returns, error goes unnoticed
  if (!application) return;
  if (!application.id) return;
  
  return submitApplication(application);
};
```

**Fail-Safe:** Gracefully handle errors to maintain system stability.

✅ **Good (Fail-Safe for UI):**
```typescript
const ApplicationList: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchApplications()
      .then(setApplications)
      .catch(err => {
        setError('Impossible de charger les candidatures');
        console.error('Fetch error:', err);
      });
  }, []);
  
  if (error) {
    return <ErrorMessage message={error} />;
  }
  
  return <div>{/* Render applications */}</div>;
};
```

**When to Use:**
- **Fail-Fast:** Data validation, internal APIs, development environments
- **Fail-Safe:** User-facing features, production environments, network requests

---

### Design by Contract (DbC)

**Definition:** Define clear preconditions, postconditions, and invariants for functions and components.

**In Practice:**

✅ **Good:**
```typescript
/**
 * Filters applications by status
 * 
 * @precondition applications array must not be null
 * @precondition status must be a valid ApplicationStatus
 * @postcondition returns array of applications matching status
 * @postcondition returned array length <= input array length
 */
const filterByStatus = (
  applications: Application[],
  status: ApplicationStatus
): Application[] => {
  if (!Array.isArray(applications)) {
    throw new Error('applications must be an array');
  }
  
  const validStatuses: ApplicationStatus[] = ['pending', 'approved', 'rejected'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }
  
  return applications.filter(app => app.status === status);
};
```

**TypeScript Contract Enforcement:**
```typescript
// Use TypeScript's type system as contracts
interface ApplicationRepository {
  // Contract: must return all applications or throw
  getAll(): Promise<Application[]>;
  
  // Contract: ID must exist or throws
  getById(id: string): Promise<Application>;
  
  // Contract: returns new application with generated ID
  create(data: Omit<Application, 'id'>): Promise<Application>;
}
```

---

## SOLID Principles in React/TypeScript

### Single Responsibility Principle (SRP)

**Definition:** Each component, hook, or function should have one reason to change.

✅ **Good:**
```typescript
// Single responsibility: display application data
const ApplicationDisplay: React.FC<{ application: Application }> = ({ application }) => {
  return (
    <div>
      <h2>{application.name}</h2>
      <p>{application.email}</p>
    </div>
  );
};

// Single responsibility: fetch application data
const useApplication = (id: string) => {
  const [application, setApplication] = useState<Application | null>(null);
  
  useEffect(() => {
    fetchApplication(id).then(setApplication);
  }, [id]);
  
  return application;
};

// Single responsibility: orchestrate
const ApplicationPage: React.FC<{ id: string }> = ({ id }) => {
  const application = useApplication(id);
  
  if (!application) return <Loading />;
  
  return <ApplicationDisplay application={application} />;
};
```

❌ **Bad:**
```typescript
// Multiple responsibilities: fetching, displaying, editing, validating
const ApplicationComponent: React.FC<{ id: string }> = ({ id }) => {
  const [application, setApplication] = useState<Application | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  useEffect(() => {
    fetch(`/api/applications/${id}`)
      .then(res => res.json())
      .then(setApplication);
  }, [id]);
  
  const validate = (data: Application) => {
    const newErrors: Record<string, string> = {};
    if (!data.name) newErrors.name = 'Required';
    if (!data.email.includes('@')) newErrors.email = 'Invalid';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSave = async () => {
    if (!application) return;
    if (!validate(application)) return;
    await fetch(`/api/applications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(application)
    });
  };
  
  // 200+ lines of mixed concerns...
  return <div>...</div>;
};
```

---

### Open/Closed Principle (OCP)

**Definition:** Components should be open for extension but closed for modification.

✅ **Good:**
```typescript
// Base component closed for modification
interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
}

const Button: React.FC<ButtonProps> = ({ 
  onClick, 
  children, 
  variant = 'primary' 
}) => {
  return (
    <button 
      onClick={onClick}
      className={`btn btn-${variant}`}
    >
      {children}
    </button>
  );
};

// Extended via composition, not modification
const SubmitButton: React.FC<{ onSubmit: () => void }> = ({ onSubmit }) => {
  return (
    <Button onClick={onSubmit} variant="primary">
      Soumettre
    </Button>
  );
};

const DeleteButton: React.FC<{ onDelete: () => void }> = ({ onDelete }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  
  return (
    <>
      <Button onClick={() => setShowConfirm(true)} variant="danger">
        Supprimer
      </Button>
      {showConfirm && <ConfirmDialog onConfirm={onDelete} />}
    </>
  );
};
```

❌ **Bad:**
```typescript
// Modification required for each new variant
const Button: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
  isSubmit?: boolean;
  isDelete?: boolean;
  showConfirm?: boolean;
}> = ({ onClick, children, isSubmit, isDelete, showConfirm }) => {
  const [confirm, setConfirm] = useState(false);
  
  const handleClick = () => {
    if (showConfirm && !confirm) {
      setConfirm(true);
      return;
    }
    onClick();
  };
  
  let className = 'btn';
  if (isSubmit) className += ' btn-primary';
  if (isDelete) className += ' btn-danger';
  
  // Gets more complex with each new requirement
  return <button onClick={handleClick} className={className}>{children}</button>;
};
```

---

### Liskov Substitution Principle (LSP)

**Definition:** Subtypes must be substitutable for their base types without breaking functionality.

✅ **Good:**
```typescript
// Contract that all implementations must honor
interface FormField {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

const TextInput: React.FC<FormField> = ({ value, onChange, error }) => {
  return (
    <div>
      <input 
        type="text" 
        value={value} 
        onChange={e => onChange(e.target.value)} 
      />
      {error && <span className="error">{error}</span>}
    </div>
  );
};

const EmailInput: React.FC<FormField> = ({ value, onChange, error }) => {
  return (
    <div>
      <input 
        type="email" 
        value={value} 
        onChange={e => onChange(e.target.value)} 
      />
      {error && <span className="error">{error}</span>}
    </div>
  );
};

// Both can be used interchangeably
const Form: React.FC<{ FieldComponent: React.FC<FormField> }> = ({ FieldComponent }) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string>();
  
  return <FieldComponent value={value} onChange={setValue} error={error} />;
};
```

❌ **Bad:**
```typescript
// Breaking the contract
const TextInput: React.FC<FormField> = ({ value, onChange, error }) => {
  return (
    <input 
      type="text" 
      value={value} 
      onChange={e => onChange(e.target.value)} 
    />
  );
};

// Incompatible interface - requires additional props
const SelectInput: React.FC<FormField & { options: string[] }> = ({ 
  value, 
  onChange, 
  error,
  options // Breaking LSP - can't substitute for FormField
}) => {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}>
      {options.map(opt => <option key={opt}>{opt}</option>)}
    </select>
  );
};
```

---

### Interface Segregation Principle (ISP)

**Definition:** Don't force components to depend on props they don't use.

✅ **Good:**
```typescript
// Minimal, focused interfaces
interface DisplayProps {
  name: string;
  email: string;
}

interface EditableProps extends DisplayProps {
  onNameChange: (name: string) => void;
  onEmailChange: (email: string) => void;
}

// Only receives what it needs
const ApplicationDisplay: React.FC<DisplayProps> = ({ name, email }) => {
  return (
    <div>
      <h2>{name}</h2>
      <p>{email}</p>
    </div>
  );
};

// Only receives what it needs
const ApplicationEdit: React.FC<EditableProps> = ({ 
  name, 
  email, 
  onNameChange, 
  onEmailChange 
}) => {
  return (
    <form>
      <input value={name} onChange={e => onNameChange(e.target.value)} />
      <input value={email} onChange={e => onEmailChange(e.target.value)} />
    </form>
  );
};
```

❌ **Bad:**
```typescript
// Fat interface - forces all consumers to know about everything
interface ApplicationProps {
  // Display props
  name: string;
  email: string;
  status: string;
  
  // Edit props
  onNameChange: (name: string) => void;
  onEmailChange: (email: string) => void;
  
  // Admin props
  onApprove: () => void;
  onReject: () => void;
  
  // Metadata props
  createdAt: Date;
  updatedAt: Date;
}

// Must accept all props even though it only uses 2
const ApplicationDisplay: React.FC<ApplicationProps> = ({ 
  name, 
  email,
  // Forced to declare but never use
  status,
  onNameChange,
  onEmailChange,
  onApprove,
  onReject,
  createdAt,
  updatedAt
}) => {
  return (
    <div>
      <h2>{name}</h2>
      <p>{email}</p>
    </div>
  );
};
```

---

### Dependency Inversion Principle (DIP)

**Definition:** Depend on abstractions (interfaces), not concrete implementations.

✅ **Good:**
```typescript
// Abstract interface
interface ApplicationRepository {
  getAll(): Promise<Application[]>;
  getById(id: string): Promise<Application>;
  create(data: CreateApplicationData): Promise<Application>;
}

// Hook depends on abstraction, not implementation
const useApplications = (repository: ApplicationRepository) => {
  const [applications, setApplications] = useState<Application[]>([]);
  
  useEffect(() => {
    repository.getAll().then(setApplications);
  }, [repository]);
  
  return applications;
};

// Concrete implementations
class ApiRepository implements ApplicationRepository {
  async getAll() {
    const res = await fetch('/api/applications');
    return res.json();
  }
  // ...
}

class MockRepository implements ApplicationRepository {
  async getAll() {
    return [{ id: '1', name: 'Test' }];
  }
  // ...
}

// Easy to swap implementations
const App = () => {
  const repo = process.env.NODE_ENV === 'test' 
    ? new MockRepository() 
    : new ApiRepository();
    
  const applications = useApplications(repo);
  return <div>{/* ... */}</div>;
};
```

❌ **Bad:**
```typescript
// Tightly coupled to concrete implementation
const useApplications = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  
  useEffect(() => {
    // Hard-coded dependency on fetch API
    fetch('/api/applications')
      .then(res => res.json())
      .then(setApplications);
  }, []);
  
  return applications;
};

// Impossible to test without real API
// Impossible to switch data sources
```

---

## React-Specific Best Practices

### When to Extract a Custom Hook

**Extract a custom hook when:**
1. Logic is reused in 2+ components
2. Logic has its own state management
3. Logic handles a specific concern (data fetching, form state, etc.)

**Decision Tree:**

```
Is this logic used in multiple components?
├─ YES → Extract to custom hook
└─ NO
   └─ Does it have complex state/side effects?
      ├─ YES → Consider extracting for testability
      └─ NO → Keep inline
```

✅ **Good:**
```typescript
// Reusable hook for form state
const useFormField = (initialValue: string) => {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string>();
  
  const validate = (validator: (val: string) => string | undefined) => {
    const err = validator(value);
    setError(err);
    return !err;
  };
  
  return { value, setValue, error, validate };
};

// Used in multiple forms
const LoginForm = () => {
  const email = useFormField('');
  const password = useFormField('');
  // ...
};

const RegistrationForm = () => {
  const email = useFormField('');
  const password = useFormField('');
  const confirmPassword = useFormField('');
  // ...
};
```

❌ **Bad:**
```typescript
// Over-extraction for single use
const useButtonClick = (onClick: () => void) => {
  return { handleClick: onClick };
};

// Just use onClick directly!
const MyComponent = () => {
  const { handleClick } = useButtonClick(() => console.log('clicked'));
  return <button onClick={handleClick}>Click</button>;
};
```

---

### Props Drilling vs Context vs Global State

**Decision Tree:**

```
How many levels deep is the data needed?
├─ 1-2 levels → Props drilling is fine
├─ 3-4 levels → Consider component composition
└─ 5+ levels or cross-cutting concern → Use Context

Is the data needed globally across the entire app?
├─ YES → Global state (Redux, Zustand)
└─ NO → Context (scoped to subtree)

Does data change frequently?
├─ YES → Be cautious with Context (re-render cost)
└─ NO → Context is great
```

✅ **Good (Props Drilling - Acceptable):**
```typescript
// 1-2 levels: props drilling is simple and clear
const App = () => {
  const [user, setUser] = useState<User>();
  return <Dashboard user={user} />;
};

const Dashboard = ({ user }: { user?: User }) => {
  return <Header user={user} />;
};

const Header = ({ user }: { user?: User }) => {
  return <div>Welcome, {user?.name}</div>;
};
```

✅ **Good (Context - Needed):**
```typescript
// 5+ levels or cross-cutting: use Context
const ThemeContext = createContext<'light' | 'dark'>('light');

const App = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  return (
    <ThemeContext.Provider value={theme}>
      <Layout>
        <Dashboard>
          <DeepNestedComponent />
        </Dashboard>
      </Layout>
    </ThemeContext.Provider>
  );
};

// Any component can access theme without drilling
const DeepNestedComponent = () => {
  const theme = useContext(ThemeContext);
  return <div className={theme}>Content</div>;
};
```

❌ **Bad:**
```typescript
// Creating context for data passed 1-2 levels (overkill)
const UserContext = createContext<User | undefined>(undefined);

const App = () => {
  const [user, setUser] = useState<User>();
  
  return (
    <UserContext.Provider value={user}>
      <Header />
    </UserContext.Provider>
  );
};

const Header = () => {
  const user = useContext(UserContext);
  return <div>{user?.name}</div>;
};

// Just use props! It's simpler and more explicit
```

---

### Component Composition Patterns

✅ **Good (Composition):**
```typescript
// Flexible, reusable components
const Card = ({ children }: { children: React.ReactNode }) => {
  return <div className="card">{children}</div>;
};

const CardHeader = ({ children }: { children: React.ReactNode }) => {
  return <div className="card-header">{children}</div>;
};

const CardBody = ({ children }: { children: React.ReactNode }) => {
  return <div className="card-body">{children}</div>;
};

// Usage: compose as needed
const ApplicationCard = ({ application }: { application: Application }) => {
  return (
    <Card>
      <CardHeader>
        <h3>{application.name}</h3>
      </CardHeader>
      <CardBody>
        <p>{application.email}</p>
        <StatusBadge status={application.status} />
      </CardBody>
    </Card>
  );
};
```

❌ **Bad (Configuration Hell):**
```typescript
// Too many props, inflexible
const Card = ({
  title,
  subtitle,
  content,
  footer,
  showHeader,
  showFooter,
  headerClassName,
  bodyClassName,
}: {
  title?: string;
  subtitle?: string;
  content: React.ReactNode;
  footer?: React.ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  headerClassName?: string;
  bodyClassName?: string;
}) => {
  return (
    <div className="card">
      {showHeader && (
        <div className={headerClassName}>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
      )}
      <div className={bodyClassName}>{content}</div>
      {showFooter && <div>{footer}</div>}
    </div>
  );
};
```

---

### Performance Optimization Guidelines

**Rule: Optimize when you have evidence of performance problems, not before.**

✅ **Good (Optimize Based on Evidence):**
```typescript
// Start simple
const ExpensiveList = ({ items }: { items: Item[] }) => {
  return (
    <div>
      {items.map(item => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
};

// Profile and measure: "List re-renders on every parent update"
// Then optimize with React.memo
const ItemCard = React.memo(({ item }: { item: Item }) => {
  return <div>{item.name}</div>;
});
```

❌ **Bad (Premature Optimization):**
```typescript
// Wrapping everything in memo/useMemo/useCallback from the start
const SimpleComponent = React.memo(({ name }: { name: string }) => {
  const memoizedName = useMemo(() => name.toUpperCase(), [name]);
  const handleClick = useCallback(() => console.log(memoizedName), [memoizedName]);
  
  return <div onClick={handleClick}>{memoizedName}</div>;
});

// This is overkill for a simple component!
```

**When to Optimize:**
- List with 100+ items that re-render unnecessarily
- Expensive computations in render (detected by profiling)
- Components that re-render on every parent update despite no prop changes

---

## Anti-Patterns to Avoid

### God Components

❌ **Bad:**
```typescript
// 500+ line component that does everything
const ApplicationManagement = () => {
  // State management
  const [applications, setApplications] = useState<Application[]>([]);
  const [filters, setFilters] = useState<Filters>({});
  const [sorting, setSorting] = useState<SortConfig>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Data fetching
  useEffect(() => {
    fetch('/api/applications')
      .then(res => res.json())
      .then(setApplications);
  }, []);
  
  // Business logic
  const handleApprove = (id: string) => { /* ... */ };
  const handleReject = (id: string) => { /* ... */ };
  const handleBulkAction = () => { /* ... */ };
  
  // Filtering logic
  const filteredApplications = applications.filter(/* ... */);
  
  // Sorting logic
  const sortedApplications = filteredApplications.sort(/* ... */);
  
  // UI rendering (100+ lines)
  return (
    <div>
      {/* Filters */}
      {/* Table */}
      {/* Pagination */}
      {/* Modals */}
    </div>
  );
};
```

✅ **Good (Decomposed):**
```typescript
const ApplicationManagement = () => {
  const applications = useApplications();
  const filters = useFilters();
  const selection = useSelection();
  
  return (
    <div>
      <ApplicationFilters {...filters} />
      <ApplicationTable 
        applications={applications.filtered} 
        selection={selection}
      />
      <BulkActions selection={selection} />
    </div>
  );
};
```

---

### Prop Drilling Hell

❌ **Bad:**
```typescript
const App = ({ user, theme, locale }: Props) => (
  <Layout user={user} theme={theme} locale={locale}>
    <Dashboard user={user} theme={theme} locale={locale}>
      <Sidebar user={user} theme={theme} locale={locale}>
        <Nav user={user} theme={theme} locale={locale}>
          <UserMenu user={user} theme={theme} locale={locale} />
        </Nav>
      </Sidebar>
    </Dashboard>
  </Layout>
);
```

✅ **Good:**
```typescript
const AppProviders = ({ children }: { children: React.ReactNode }) => (
  <UserProvider>
    <ThemeProvider>
      <LocaleProvider>
        {children}
      </LocaleProvider>
    </ThemeProvider>
  </UserProvider>
);

const App = () => (
  <AppProviders>
    <Layout>
      <Dashboard>
        <Sidebar>
          <Nav>
            <UserMenu />
          </Nav>
        </Sidebar>
      </Dashboard>
    </Layout>
  </AppProviders>
);
```

---

### Hidden Side Effects

❌ **Bad:**
```typescript
// Side effect hidden in getter
const Application = {
  get fullName() {
    // Hidden API call!
    fetch('/api/user').then(/* ... */);
    return `${this.firstName} ${this.lastName}`;
  }
};

// Side effect in render
const Component = ({ id }: { id: string }) => {
  // Fetches on every render!
  const data = fetchData(id);
  return <div>{data}</div>;
};
```

✅ **Good:**
```typescript
// Explicit side effects in useEffect
const Component = ({ id }: { id: string }) => {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetchData(id).then(setData);
  }, [id]);
  
  return <div>{data}</div>;
};
```

---

### Magic Numbers and Strings

❌ **Bad:**
```typescript
const Component = () => {
  const [status, setStatus] = useState('pending');
  
  if (status === 'approved') { /* ... */ }
  if (status === 'rejected') { /* ... */ }
  
  setTimeout(() => {}, 3000); // What is 3000?
  
  const limit = data.slice(0, 10); // Why 10?
};
```

✅ **Good:**
```typescript
const APPLICATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

const NOTIFICATION_TIMEOUT_MS = 3000;
const DEFAULT_PAGE_SIZE = 10;

const Component = () => {
  const [status, setStatus] = useState(APPLICATION_STATUS.PENDING);
  
  if (status === APPLICATION_STATUS.APPROVED) { /* ... */ }
  if (status === APPLICATION_STATUS.REJECTED) { /* ... */ }
  
  setTimeout(() => {}, NOTIFICATION_TIMEOUT_MS);
  
  const limit = data.slice(0, DEFAULT_PAGE_SIZE);
};
```

---

## Decision Trees

### Should I Create a New Component?

```
Does this UI section appear in multiple places?
├─ YES → Create component
└─ NO
   └─ Is this section >50 lines?
      ├─ YES → Consider extracting for readability
      └─ NO → Keep inline
```

### Should I Use Context or Props?

```
How many components need this data?
├─ 1-3 components in same tree → Props
├─ 4-10 components across 3+ levels → Context
└─ App-wide state → Global state management

Does data change frequently?
├─ YES (every keystroke) → Prefer props or local state
└─ NO (user session, theme) → Context is good
```

### Should I Optimize This Component?

```
Do you have performance measurements showing a problem?
├─ NO → Don't optimize yet
└─ YES
   └─ What's the issue?
      ├─ Unnecessary re-renders → React.memo
      ├─ Expensive calculation → useMemo
      ├─ Function recreation → useCallback
      └─ Large list → Virtualization
```

---

## Code Review Checklist

### Principles
- [ ] Does the code follow KISS? Could it be simpler?
- [ ] Does it implement only what's needed (YAGNI)?
- [ ] Is duplicated logic properly abstracted (DRY)?
- [ ] Are errors handled appropriately (Fail-Fast/Fail-Safe)?

### SOLID
- [ ] Does each component/hook have a single responsibility?
- [ ] Can components be extended without modification?
- [ ] Do subtypes honor their contracts (LSP)?
- [ ] Are interfaces minimal and focused (ISP)?
- [ ] Does code depend on abstractions, not concrete implementations?

### React Best Practices
- [ ] Are custom hooks justified (reuse/complexity)?
- [ ] Is Context used appropriately (not for props 1-2 levels deep)?
- [ ] Are components composed rather than configured?
- [ ] Is optimization based on measured performance issues?

### Anti-Patterns
- [ ] Are components focused (<200 lines)?
- [ ] Is prop drilling minimized (3+ levels)?
- [ ] Are side effects explicit and in useEffect?
- [ ] Are magic numbers/strings replaced with named constants?

### General
- [ ] Is the code readable and self-documenting?
- [ ] Are types properly defined?
- [ ] Are error cases handled?
- [ ] Is the code testable?

---

## Contributing to This Document

This document is living documentation. If you find patterns that work well or anti-patterns to avoid, please submit updates with concrete examples.

**Last Updated:** January 2026