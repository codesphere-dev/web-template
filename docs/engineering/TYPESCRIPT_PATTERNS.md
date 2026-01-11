# TypeScript Strict Typing Guidelines and Patterns

This document provides comprehensive TypeScript typing guidelines, patterns, and anti-patterns for the web-template project. It serves as a decision framework for developers working with complex typing scenarios.

## Table of Contents

1. [Type Safety Fundamentals](#type-safety-fundamentals)
2. [React-Specific Patterns](#react-specific-patterns)
3. [Advanced Patterns](#advanced-patterns)
4. [API Response Validation](#api-response-validation)
5. [Common Mistakes & Solutions](#common-mistakes--solutions)
6. [Type Decision Matrix](#type-decision-matrix)
7. [ESLint Rule References](#eslint-rule-references)
8. [Resources](#resources)

---

## Type Safety Fundamentals

### Why We Ban `any`

The `any` type defeats the purpose of TypeScript by disabling all type checking. It:
- Hides bugs that would be caught at compile time
- Breaks type inference throughout the codebase
- Makes refactoring dangerous and error-prone
- Provides no editor autocompletion or documentation

**ESLint Rule:** `@typescript-eslint/no-explicit-any`

❌ **Bad:**
```typescript
// any allows anything - no safety
function processData(data: any) {
  return data.nonExistentProperty.deepValue; // No error, but runtime crash!
}

const result: any = fetchUser();
result.wrongMethod(); // No error, runtime crash
```

✅ **Good:**
```typescript
// Explicit types catch errors at compile time
function processData(data: UserData) {
  return data.profile.displayName; // Type-checked, autocompleted
}

const result: User = await fetchUser();
result.getName(); // IDE shows available methods
```

---

### When to Use `unknown`

Use `unknown` when you cannot know the type at compile time. It forces you to validate before use, making it the type-safe alternative to `any`.

**Use `unknown` for:**
- External data (API responses, user input, localStorage)
- Values from `JSON.parse()`
- Catch block error parameters
- Function parameters that accept any value but need validation

❌ **Bad:**
```typescript
// Using any for external data - dangerous
async function fetchUser(): Promise<any> {
  const response = await fetch('/api/user');
  return response.json(); // Could be anything!
}

const user = await fetchUser();
console.log(user.name); // No guarantee this exists
```

✅ **Good:**
```typescript
// Using unknown forces validation
async function fetchData(): Promise<unknown> {
  const response = await fetch('/api/user');
  return response.json();
}

function isUser(data: unknown): data is User {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data &&
    typeof (data as User).id === 'string' &&
    typeof (data as User).name === 'string'
  );
}

const data = await fetchData();
if (isUser(data)) {
  console.log(data.name); // Type-safe access
}
```

**Pattern: Safe JSON parsing**
```typescript
function safeJsonParse(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}

// With Zod for validation
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

const data = safeJsonParse(rawJson);
const result = UserSchema.safeParse(data);

if (result.success) {
  const user = result.data; // Fully typed as User
}
```

---

### When to Use `never`

Use `never` to represent impossible states or exhaustive checks. It helps TypeScript catch logical errors at compile time.

**Use `never` for:**
- Exhaustive switch/if checks
- Functions that never return (throw errors, infinite loops)
- Impossible type intersections
- Branding types

**Pattern 1: Exhaustive Switch**
```typescript
type Status = 'pending' | 'approved' | 'rejected';

function getStatusColor(status: Status): string {
  switch (status) {
    case 'pending':
      return 'yellow';
    case 'approved':
      return 'green';
    case 'rejected':
      return 'red';
    default:
      // If we add a new status, TypeScript will error here
      const _exhaustive: never = status;
      throw new Error(`Unhandled status: ${_exhaustive}`);
  }
}

// Adding 'cancelled' to Status will cause a compile error
// until we handle it in the switch statement
```

**Pattern 2: Assertion Functions**
```typescript
function assertNever(value: never, message?: string): never {
  throw new Error(message ?? `Unexpected value: ${value}`);
}

type Shape = 
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; side: number }
  | { kind: 'rectangle'; width: number; height: number };

function getArea(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'square':
      return shape.side ** 2;
    case 'rectangle':
      return shape.width * shape.height;
    default:
      return assertNever(shape); // Compile error if we miss a case
  }
}
```

**Pattern 3: Functions That Never Return**
```typescript
function fail(message: string): never {
  throw new Error(message);
}

function infiniteLoop(): never {
  while (true) {
    // Process events forever
  }
}
```

---

### Proper Use of `as const`

Use `as const` to create literal types from values. It makes all properties `readonly` and infers the narrowest possible type.

**Use `as const` for:**
- Configuration objects
- Enum-like constants
- Tuple types
- Type-safe object keys

❌ **Bad:**
```typescript
// Without as const - types are too wide
const config = {
  endpoint: '/api/users',
  method: 'GET',
  timeout: 5000,
};
// Type: { endpoint: string; method: string; timeout: number }

const statuses = ['pending', 'approved', 'rejected'];
// Type: string[]
```

✅ **Good:**
```typescript
// With as const - exact literal types
const config = {
  endpoint: '/api/users',
  method: 'GET',
  timeout: 5000,
} as const;
// Type: { readonly endpoint: "/api/users"; readonly method: "GET"; readonly timeout: 5000 }

const statuses = ['pending', 'approved', 'rejected'] as const;
// Type: readonly ["pending", "approved", "rejected"]

type Status = typeof statuses[number]; // "pending" | "approved" | "rejected"
```

**Pattern: Type-Safe Constants**
```typescript
const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
} as const;

type HttpMethod = typeof HTTP_METHODS[keyof typeof HTTP_METHODS];
// Type: "GET" | "POST" | "PUT" | "DELETE"

function fetchData(url: string, method: HttpMethod) {
  // method is guaranteed to be one of the four values
}
```

---

### Proper Use of `satisfies`

Use `satisfies` (TypeScript 4.9+) to validate that an expression matches a type while preserving the narrowest possible type inference.

**Use `satisfies` for:**
- Validating object structure without widening types
- Ensuring configuration objects match interfaces
- Getting autocomplete while maintaining literal types

❌ **Bad:**
```typescript
// Type annotation widens the type
const routes: Record<string, { path: string; component: string }> = {
  home: { path: '/', component: 'HomePage' },
  about: { path: '/about', component: 'AboutPage' },
};

routes.home.path; // string (not "/" literal)
routes.nonexistent; // No error! Record allows any key
```

✅ **Good:**
```typescript
// satisfies validates structure while preserving literals
const routes = {
  home: { path: '/', component: 'HomePage' },
  about: { path: '/about', component: 'AboutPage' },
} satisfies Record<string, { path: string; component: string }>;

routes.home.path; // "/" (literal type preserved)
routes.nonexistent; // Error: Property 'nonexistent' does not exist
```

**Pattern: Configuration with satisfies**
```typescript
interface ThemeConfig {
  colors: Record<string, string>;
  spacing: Record<string, number>;
}

const theme = {
  colors: {
    primary: '#007bff',
    secondary: '#6c757d',
    danger: '#dc3545',
  },
  spacing: {
    small: 8,
    medium: 16,
    large: 24,
  },
} satisfies ThemeConfig;

// Autocomplete works for exact keys
theme.colors.primary; // "#007bff" (literal)
theme.spacing.medium; // 16 (literal)

// Type checking still validates structure
const badTheme = {
  colors: { primary: 123 }, // Error: Type 'number' is not assignable to type 'string'
  spacing: {},
} satisfies ThemeConfig;
```

---

## React-Specific Patterns

### Component Props

**Pattern: Extending HTML Attributes**
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  variant,
  size = 'medium',
  isLoading = false,
  children,
  disabled,
  ...rest // All other button attributes
}) => {
  return (
    <button
      className={`btn btn-${variant} btn-${size}`}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading ? <Spinner /> : children}
    </button>
  );
};
```

**Pattern: Polymorphic Components**
```typescript
type PolymorphicProps<E extends React.ElementType> = {
  as?: E;
  children: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<E>, 'as' | 'children'>;

function Box<E extends React.ElementType = 'div'>({
  as,
  children,
  ...props
}: PolymorphicProps<E>) {
  const Component = as || 'div';
  return <Component {...props}>{children}</Component>;
}

// Usage
<Box>Default div</Box>
<Box as="section">Section element</Box>
<Box as="a" href="/home">Link element</Box>
<Box as={CustomComponent} customProp="value">Custom</Box>
```

**Pattern: Discriminated Union Props**
```typescript
type ModalProps =
  | {
      variant: 'confirm';
      onConfirm: () => void;
      onCancel: () => void;
    }
  | {
      variant: 'alert';
      onClose: () => void;
    }
  | {
      variant: 'form';
      onSubmit: (data: FormData) => void;
      onCancel: () => void;
    };

const Modal: React.FC<ModalProps & { title: string }> = (props) => {
  switch (props.variant) {
    case 'confirm':
      return (
        <div>
          <h2>{props.title}</h2>
          <button onClick={props.onConfirm}>Confirm</button>
          <button onClick={props.onCancel}>Cancel</button>
        </div>
      );
    case 'alert':
      return (
        <div>
          <h2>{props.title}</h2>
          <button onClick={props.onClose}>OK</button>
        </div>
      );
    case 'form':
      return (
        <form onSubmit={(e) => { e.preventDefault(); props.onSubmit(new FormData(e.currentTarget)); }}>
          <h2>{props.title}</h2>
          {/* form fields */}
          <button type="submit">Submit</button>
          <button type="button" onClick={props.onCancel}>Cancel</button>
        </form>
      );
  }
};
```

---

### Custom Hook Typing

**Pattern: Generic Data Fetching Hook**
```typescript
interface UseFetchResult<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

function useFetch<T>(url: string): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      const json = await response.json();
      setData(json as T);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, error, isLoading, refetch: fetchData };
}

// Usage
interface User {
  id: string;
  name: string;
  email: string;
}

const UserProfile: React.FC<{ userId: string }> = ({ userId }) => {
  const { data: user, error, isLoading } = useFetch<User>(`/api/users/${userId}`);

  if (isLoading) return <Loading />;
  if (error) return <Error message={error.message} />;
  if (!user) return null;

  return <div>{user.name}</div>; // user is typed as User
};
```

**Pattern: Form State Hook with Validation**
```typescript
interface UseFormOptions<T> {
  initialValues: T;
  validate: (values: T) => Partial<Record<keyof T, string>>;
  onSubmit: (values: T) => Promise<void>;
}

interface UseFormResult<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  handleChange: <K extends keyof T>(field: K, value: T[K]) => void;
  handleBlur: (field: keyof T) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  reset: () => void;
}

function useForm<T extends Record<string, unknown>>({
  initialValues,
  validate,
  onSubmit,
}: UseFormOptions<T>): UseFormResult<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleBlur = useCallback((field: keyof T) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors(validate(values));
  }, [validate, values]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate(values);
    setErrors(validationErrors);
    
    if (Object.keys(validationErrors).length === 0) {
      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [values, validate, onSubmit]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
  };
}
```

---

### Event Handler Typing

**Common Event Types:**
```typescript
// Mouse events
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();
  console.log(e.currentTarget.name);
};

const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
  console.log(e.clientX, e.clientY);
};

// Keyboard events
const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    // Submit form
  }
};

// Form events
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
};

// Change events
const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value, type, checked } = e.target;
  setValue(type === 'checkbox' ? checked : value);
};

const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  setSelected(e.target.value);
};

// Focus events
const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.select();
};

// Drag events
const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
  e.dataTransfer.setData('text/plain', e.currentTarget.id);
};
```

**Pattern: Generic Event Handler Factory**
```typescript
type EventHandler<E extends React.SyntheticEvent> = (event: E) => void;

function createHandler<E extends React.SyntheticEvent>(
  handler: EventHandler<E>,
  preventDefault = false
): EventHandler<E> {
  return (event: E) => {
    if (preventDefault) {
      event.preventDefault();
    }
    handler(event);
  };
}

// Usage
const handleClick = createHandler<React.MouseEvent<HTMLButtonElement>>(
  (e) => console.log('Clicked:', e.currentTarget.name),
  true
);
```

---

## Advanced Patterns

### Discriminated Unions for State Management

**Pattern: Loading State Machine**
```typescript
type AsyncState<T, E = Error> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: E };

function useAsync<T>(): [
  AsyncState<T>,
  {
    setIdle: () => void;
    setLoading: () => void;
    setSuccess: (data: T) => void;
    setError: (error: Error) => void;
  }
] {
  const [state, setState] = useState<AsyncState<T>>({ status: 'idle' });

  const actions = useMemo(() => ({
    setIdle: () => setState({ status: 'idle' }),
    setLoading: () => setState({ status: 'loading' }),
    setSuccess: (data: T) => setState({ status: 'success', data }),
    setError: (error: Error) => setState({ status: 'error', error }),
  }), []);

  return [state, actions];
}

// Usage with exhaustive rendering
function UserProfile() {
  const [state, { setLoading, setSuccess, setError }] = useAsync<User>();

  useEffect(() => {
    setLoading();
    fetchUser()
      .then(setSuccess)
      .catch(setError);
  }, []);

  switch (state.status) {
    case 'idle':
      return null;
    case 'loading':
      return <Spinner />;
    case 'success':
      return <div>{state.data.name}</div>; // data is typed as User
    case 'error':
      return <Error message={state.error.message} />;
  }
}
```

**Pattern: Form Wizard State**
```typescript
type WizardState =
  | { step: 'personal'; data: Partial<PersonalInfo> }
  | { step: 'address'; data: PersonalInfo & Partial<AddressInfo> }
  | { step: 'payment'; data: PersonalInfo & AddressInfo & Partial<PaymentInfo> }
  | { step: 'review'; data: PersonalInfo & AddressInfo & PaymentInfo }
  | { step: 'complete'; data: CompleteFormData; orderId: string };

type WizardAction =
  | { type: 'NEXT'; payload: Partial<FormData> }
  | { type: 'BACK' }
  | { type: 'COMPLETE'; orderId: string }
  | { type: 'RESET' };

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'NEXT':
      switch (state.step) {
        case 'personal':
          return {
            step: 'address',
            data: { ...state.data, ...action.payload } as PersonalInfo,
          };
        // ... handle other steps
      }
    // ... handle other actions
  }
}
```

---

### Generic Constraints and Inference

**Pattern: Constrained Generic**
```typescript
// Constraint: T must have an 'id' property
function findById<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find((item) => item.id === id);
}

// Constraint: T must be a key of the object
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

// Constraint: T must be a constructor
type Constructor<T = object> = new (...args: unknown[]) => T;

function createInstance<T>(ctor: Constructor<T>): T {
  return new ctor();
}
```

**Pattern: Infer from Function Parameters**
```typescript
// Infer return type from callback
function createAsyncHandler<T>(
  fn: () => Promise<T>
): () => Promise<{ data: T; timestamp: number }> {
  return async () => {
    const data = await fn();
    return { data, timestamp: Date.now() };
  };
}

// Usage - T is inferred from fetchUser's return type
const handler = createAsyncHandler(fetchUser);
// Returns Promise<{ data: User; timestamp: number }>
```

**Pattern: Conditional Return Types**
```typescript
function processValue<T extends string | number>(
  value: T
): T extends string ? string[] : number[] {
  if (typeof value === 'string') {
    return value.split('') as T extends string ? string[] : number[];
  }
  return [value] as T extends string ? string[] : number[];
}

const strings = processValue('hello'); // string[]
const numbers = processValue(42); // number[]
```

---

### Mapped Types and Conditional Types

**Pattern: Make All Properties Optional Recursively**
```typescript
type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

interface Config {
  server: {
    host: string;
    port: number;
    ssl: {
      enabled: boolean;
      cert: string;
    };
  };
  logging: {
    level: 'debug' | 'info' | 'error';
  };
}

type PartialConfig = DeepPartial<Config>;
// All nested properties are now optional
```

**Pattern: Extract Specific Properties**
```typescript
type PickByType<T, U> = {
  [P in keyof T as T[P] extends U ? P : never]: T[P];
};

interface User {
  id: string;
  name: string;
  age: number;
  isActive: boolean;
  email: string;
}

type StringFields = PickByType<User, string>;
// { id: string; name: string; email: string }

type NumberFields = PickByType<User, number>;
// { age: number }
```

**Pattern: Create Event Handler Types from Object**
```typescript
type EventHandlers<T> = {
  [K in keyof T as `on${Capitalize<string & K>}Change`]: (value: T[K]) => void;
};

interface FormFields {
  name: string;
  email: string;
  age: number;
}

type FormHandlers = EventHandlers<FormFields>;
// {
//   onNameChange: (value: string) => void;
//   onEmailChange: (value: string) => void;
//   onAgeChange: (value: number) => void;
// }
```

---

### Type Guards and Assertion Functions

**Pattern: User-Defined Type Guard**
```typescript
interface Dog {
  kind: 'dog';
  bark(): void;
}

interface Cat {
  kind: 'cat';
  meow(): void;
}

type Animal = Dog | Cat;

// Type guard function
function isDog(animal: Animal): animal is Dog {
  return animal.kind === 'dog';
}

function handleAnimal(animal: Animal) {
  if (isDog(animal)) {
    animal.bark(); // TypeScript knows it's a Dog
  } else {
    animal.meow(); // TypeScript knows it's a Cat
  }
}
```

**Pattern: Array Type Guard**
```typescript
function isNonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

const items: (string | null | undefined)[] = ['a', null, 'b', undefined, 'c'];
const filtered = items.filter(isNonNullable);
// Type: string[]
```

**Pattern: Assertion Function**
```typescript
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error(`Expected string, got ${typeof value}`);
  }
}

function assertIsDefined<T>(value: T): asserts value is NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error('Value is null or undefined');
  }
}

// Usage
function processInput(input: unknown) {
  assertIsString(input);
  // After assertion, input is typed as string
  console.log(input.toUpperCase());
}

function getUser(users: Map<string, User>, id: string): User {
  const user = users.get(id);
  assertIsDefined(user);
  // After assertion, user is typed as User (not User | undefined)
  return user;
}
```

---

### Branded Types for Domain Safety

**Pattern: Branded Primitives**
```typescript
// Create branded types to prevent mixing incompatible values
type Brand<K, T> = K & { __brand: T };

type UserId = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;
type Email = Brand<string, 'Email'>;

// Factory functions ensure values are validated
function createUserId(id: string): UserId {
  if (!id.startsWith('user_')) {
    throw new Error('Invalid user ID format');
  }
  return id as UserId;
}

function createEmail(email: string): Email {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }
  return email as Email;
}

// Functions can require specific branded types
function getUser(id: UserId): Promise<User> {
  return fetch(`/api/users/${id}`).then((r) => r.json());
}

function getOrder(id: OrderId): Promise<Order> {
  return fetch(`/api/orders/${id}`).then((r) => r.json());
}

// Usage
const userId = createUserId('user_123');
const orderId = createOrderId('order_456');

getUser(userId); // ✅ OK
getUser(orderId); // ❌ Error: OrderId is not assignable to UserId
```

**Pattern: Branded Numbers**
```typescript
type Percentage = Brand<number, 'Percentage'>;
type Currency = Brand<number, 'Currency'>;
type Pixels = Brand<number, 'Pixels'>;

function createPercentage(value: number): Percentage {
  if (value < 0 || value > 100) {
    throw new Error('Percentage must be between 0 and 100');
  }
  return value as Percentage;
}

function createCurrency(value: number): Currency {
  return Math.round(value * 100) / 100 as Currency;
}

function calculateDiscount(price: Currency, discount: Percentage): Currency {
  return createCurrency(price * (1 - discount / 100));
}

// Prevents mixing up different numeric types
const price = createCurrency(99.99);
const discount = createPercentage(20);
const finalPrice = calculateDiscount(price, discount); // ✅ Type-safe
```

---

## API Response Validation

### Integration with Zod Schemas

**Pattern: Define Schema and Infer Type**
```typescript
import { z } from 'zod';

// Define schema
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'guest']),
  createdAt: z.string().datetime(),
  profile: z.object({
    avatar: z.string().url().nullable(),
    bio: z.string().max(500).optional(),
  }).optional(),
});

// Infer TypeScript type from schema
type User = z.infer<typeof UserSchema>;
// {
//   id: string;
//   name: string;
//   email: string;
//   role: "admin" | "user" | "guest";
//   createdAt: string;
//   profile?: { avatar: string | null; bio?: string } | undefined;
// }
```

**Pattern: API Response Validation**
```typescript
const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
    meta: z.object({
      timestamp: z.string().datetime(),
      requestId: z.string(),
    }),
  });

const UserListResponseSchema = ApiResponseSchema(z.array(UserSchema));

type UserListResponse = z.infer<typeof UserListResponseSchema>;

async function fetchUsers(): Promise<User[]> {
  const response = await fetch('/api/users');
  const json: unknown = await response.json();
  
  const result = UserListResponseSchema.safeParse(json);
  
  if (!result.success) {
    console.error('Validation errors:', result.error.flatten());
    throw new Error('Invalid API response');
  }
  
  return result.data.data;
}
```

**Pattern: Form Validation with Zod**
```typescript
const CreateUserSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  email: z.string()
    .email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type CreateUserInput = z.infer<typeof CreateUserSchema>;

function useCreateUserForm() {
  const [errors, setErrors] = useState<z.ZodFormattedError<CreateUserInput> | null>(null);

  const validate = (data: unknown): CreateUserInput | null => {
    const result = CreateUserSchema.safeParse(data);
    
    if (!result.success) {
      setErrors(result.error.format());
      return null;
    }
    
    setErrors(null);
    return result.data;
  };

  return { errors, validate };
}
```

---

### Type Inference from Validators

**Pattern: Infer Types from Existing Validators**
```typescript
// When you have runtime validators, infer types from them
import { z } from 'zod';

// Define all schemas in one place
const schemas = {
  user: z.object({
    id: z.string(),
    name: z.string(),
  }),
  post: z.object({
    id: z.string(),
    title: z.string(),
    authorId: z.string(),
  }),
  comment: z.object({
    id: z.string(),
    postId: z.string(),
    content: z.string(),
  }),
} as const;

// Infer all types automatically
type Schemas = typeof schemas;
type User = z.infer<Schemas['user']>;
type Post = z.infer<Schemas['post']>;
type Comment = z.infer<Schemas['comment']>;

// Generic validator function
function validate<K extends keyof Schemas>(
  schemaKey: K,
  data: unknown
): z.infer<Schemas[K]> {
  return schemas[schemaKey].parse(data);
}

// Usage
const user = validate('user', { id: '1', name: 'John' }); // Typed as User
const post = validate('post', { id: '1', title: 'Hello', authorId: '1' }); // Typed as Post
```

---

### Runtime Type Checking Patterns

**Pattern: Safe API Client**
```typescript
import { z } from 'zod';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async get<T>(
    endpoint: string,
    schema: z.ZodType<T>
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const json: unknown = await response.json();
    return schema.parse(json);
  }

  async post<T, B>(
    endpoint: string,
    body: B,
    responseSchema: z.ZodType<T>
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const json: unknown = await response.json();
    return responseSchema.parse(json);
  }
}

// Usage
const api = new ApiClient('https://api.example.com');

const users = await api.get('/users', z.array(UserSchema));
// users is typed as User[]

const newUser = await api.post(
  '/users',
  { name: 'John', email: 'john@example.com' },
  UserSchema
);
// newUser is typed as User
```

---

## Common Mistakes & Solutions

### Type Assertion Abuse

❌ **Bad: Using assertions to silence TypeScript**
```typescript
// Dangerous: assumes data structure without validation
const user = JSON.parse(response) as User;
console.log(user.name); // Might crash at runtime!

// Dangerous: double assertion to bypass type checking
const config = rawConfig as unknown as Config;

// Dangerous: non-null assertion without validation
function getUser(id: string) {
  const user = users.find(u => u.id === id)!; // Crashes if not found
  return user;
}
```

✅ **Good: Validate before asserting**
```typescript
// Safe: validate with Zod before using
const parseResult = UserSchema.safeParse(JSON.parse(response));
if (!parseResult.success) {
  throw new Error('Invalid user data');
}
const user = parseResult.data;

// Safe: use type guards
function isConfig(data: unknown): data is Config {
  return (
    typeof data === 'object' &&
    data !== null &&
    'apiKey' in data &&
    'endpoint' in data
  );
}

if (isConfig(rawConfig)) {
  const config = rawConfig; // Safely typed as Config
}

// Safe: handle the undefined case
function getUser(id: string): User | undefined {
  return users.find(u => u.id === id);
}

// Or throw explicit error
function getUserOrThrow(id: string): User {
  const user = users.find(u => u.id === id);
  if (!user) {
    throw new Error(`User not found: ${id}`);
  }
  return user;
}
```

---

### Over-Engineering with Generics

❌ **Bad: Unnecessary generics**
```typescript
// Over-engineered: generic not needed
function wrapInArray<T>(value: T): T[] {
  return [value];
}

// Over-engineered: complex generics for simple use case
type DeepReadonlyArray<T> = ReadonlyArray<DeepReadonly<T>>;
type DeepReadonlyObject<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
};
type DeepReadonly<T> = T extends (infer U)[]
  ? DeepReadonlyArray<U>
  : T extends object
  ? DeepReadonlyObject<T>
  : T;

// Used for a simple config that never changes
const config: DeepReadonly<Config> = { /* ... */ };
```

✅ **Good: Use generics only when needed**
```typescript
// Simple: no generic needed for specific type
function wrapUserInArray(user: User): User[] {
  return [user];
}

// Or use generic only when reused with multiple types
function wrapInArray<T>(value: T): T[] {
  return [value];
}

// Simple: use Readonly for shallow immutability when that's enough
const config: Readonly<Config> = { /* ... */ };

// Use DeepReadonly only when you actually need deep immutability
// and have nested mutable objects
```

**Rule of thumb for generics:**
1. Start without generics
2. Add generic when you need to preserve a type relationship
3. Keep constraints as simple as possible
4. If generic is only used once, you probably don't need it

---

### Missing Null/Undefined Handling

❌ **Bad: Ignoring nullable values**
```typescript
// Crashes if user is undefined
function displayUser(user?: User) {
  return `Hello, ${user.name}!`; // Error waiting to happen
}

// Ignores potential undefined from array access
function getFirst(items: string[]) {
  return items[0].toUpperCase(); // Crashes on empty array
}

// Forgets that find can return undefined
function getUserRole(users: User[], id: string) {
  const user = users.find(u => u.id === id);
  return user.role; // user might be undefined!
}
```

✅ **Good: Handle all nullable cases**
```typescript
// Option 1: Required parameter (caller must provide)
function displayUser(user: User) {
  return `Hello, ${user.name}!`;
}

// Option 2: Handle undefined explicitly
function displayUser(user?: User) {
  if (!user) {
    return 'Hello, Guest!';
  }
  return `Hello, ${user.name}!`;
}

// Option 3: Use optional chaining and nullish coalescing
function displayUser(user?: User) {
  return `Hello, ${user?.name ?? 'Guest'}!`;
}

// Handle array access safely
function getFirst(items: string[]): string | undefined {
  return items[0]?.toUpperCase();
}

// Or with default value
function getFirstOrDefault(items: string[], defaultValue: string): string {
  return items[0]?.toUpperCase() ?? defaultValue;
}

// Handle find result properly
function getUserRole(users: User[], id: string): Role | undefined {
  return users.find(u => u.id === id)?.role;
}
```

---

### Circular Type Dependencies

❌ **Bad: Circular imports and type dependencies**
```typescript
// user.ts
import { Post } from './post'; // Circular!

export interface User {
  id: string;
  posts: Post[];
}

// post.ts
import { User } from './user'; // Circular!

export interface Post {
  id: string;
  author: User;
}
```

✅ **Good: Break cycles with separate type files or lazy references**
```typescript
// Solution 1: Shared types file
// types.ts
export interface User {
  id: string;
  posts: Post[];
}

export interface Post {
  id: string;
  author: User;
}

// user.ts
import { User } from './types';
export function createUser(): User { /* ... */ }

// post.ts
import { Post } from './types';
export function createPost(): Post { /* ... */ }
```

```typescript
// Solution 2: Use IDs instead of full objects
// user.ts
export interface User {
  id: string;
  postIds: string[]; // Reference by ID, not full object
}

// post.ts
export interface Post {
  id: string;
  authorId: string; // Reference by ID, not full object
}

// When you need the full object, fetch it
async function getUserWithPosts(userId: string): Promise<{
  user: User;
  posts: Post[];
}> {
  const user = await getUser(userId);
  const posts = await Promise.all(user.postIds.map(getPost));
  return { user, posts };
}
```

```typescript
// Solution 3: Generic relationship types
// types.ts
export interface Entity {
  id: string;
}

export interface WithRelation<T extends Entity, R extends Entity> extends T {
  related: R[];
}

// user.ts
export interface BaseUser extends Entity {
  name: string;
}

// post.ts
export interface BasePost extends Entity {
  title: string;
}

// Compose when needed
type UserWithPosts = WithRelation<BaseUser, BasePost>;
```

---

## Type Decision Matrix

Use this matrix to choose the right type approach:

| Scenario | Recommended Type | Reason |
|----------|-----------------|--------|
| External API response | `unknown` + Zod validation | Can't trust external data |
| User input | `unknown` + validation | Must validate before use |
| Function that never returns | `never` | Represents impossible state |
| Exhaustive switch default | `never` | Catches missing cases |
| Configuration object | `as const` | Preserves literal types |
| Object validation | `satisfies` | Validates without widening |
| Type-safe constants | `as const` + type extraction | Creates union from values |
| Preventing value mixing | Branded types | Compile-time safety |
| Optional but present props | `Required<T>` | Makes all props required |
| Deep optional props | `DeepPartial<T>` | All nested props optional |
| Type from validator | `z.infer<typeof Schema>` | Single source of truth |
| Polymorphic component | Generics with `extends` | Type-safe element switching |
| State machine | Discriminated union | Exhaustive state handling |

---

## ESLint Rule References

Configure these rules in your `.eslintrc.js` to enforce type safety:

```javascript
module.exports = {
  rules: {
    // Ban any
    '@typescript-eslint/no-explicit-any': 'error',
    
    // Require explicit return types on exported functions
    '@typescript-eslint/explicit-function-return-type': ['error', {
      allowExpressions: true,
      allowTypedFunctionExpressions: true,
    }],
    
    // Require explicit types on public class members
    '@typescript-eslint/explicit-member-accessibility': 'error',
    
    // Disallow non-null assertions
    '@typescript-eslint/no-non-null-assertion': 'warn',
    
    // Require Promise-like values to be handled
    '@typescript-eslint/no-floating-promises': 'error',
    
    // Require expressions of type void to appear in statement position
    '@typescript-eslint/no-confusing-void-expression': 'error',
    
    // Disallow type assertions that narrow a type
    '@typescript-eslint/consistent-type-assertions': ['error', {
      assertionStyle: 'as',
      objectLiteralTypeAssertions: 'never',
    }],
    
    // Prefer nullish coalescing operator
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    
    // Prefer optional chaining
    '@typescript-eslint/prefer-optional-chain': 'error',
    
    // Require switch-case to be exhaustive
    '@typescript-eslint/switch-exhaustiveness-check': 'error',
    
    // Enforce using type imports
    '@typescript-eslint/consistent-type-imports': ['error', {
      prefer: 'type-imports',
    }],
    
    // Require strict boolean expressions
    '@typescript-eslint/strict-boolean-expressions': 'error',
  },
};
```

### Recommended tsconfig.json Settings

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "useUnknownInCatchVariables": true,
    "alwaysStrict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true
  }
}
```

---

## Resources

### Official Documentation
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

### Validation Libraries
- [Zod Documentation](https://zod.dev/)
- [io-ts](https://gcanti.github.io/io-ts/)
- [Yup](https://github.com/jquense/yup)

### Advanced Topics
- [Type Challenges](https://github.com/type-challenges/type-challenges) - Practice TypeScript type system
- [Total TypeScript](https://www.totaltypescript.com/) - Advanced TypeScript tutorials

### Project References
- [Good Practices Guide](./good-practices.md) - Engineering principles for this project
- [ESLint Configuration](../../.eslintrc.js) - Project ESLint rules

---

## Contributing

This document is living documentation. If you encounter patterns not covered here or have improvements to suggest, please:

1. Open an issue describing the pattern or improvement
2. Submit a PR with examples following the format in this document

**Last Updated:** January 2026
