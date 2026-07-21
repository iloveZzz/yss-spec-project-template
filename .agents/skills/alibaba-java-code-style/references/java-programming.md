# Java Programming Rules

Use this reference for Java implementation and review: naming, constants, formatting, OOP, collections, concurrency, control flow, comments, and general coding traps.

## Naming

Mandatory:

- Do not start or end identifiers with `_` or `$`.
- Do not mix pinyin and English; do not use Chinese identifiers. Widely recognized names such as `alibaba`, `taobao`, `youku`, and `hangzhou` are acceptable.
- Use `UpperCamelCase` for classes, except suffix acronyms such as `DO`, `BO`, `DTO`, `VO`, `AO`, `PO`, and `UID`.
- Use `lowerCamelCase` for methods, parameters, member variables, and local variables.
- Use uppercase words separated by underscores for constants, with complete semantics such as `MAX_STOCK_COUNT`.
- Name abstract classes with `Abstract` or `Base` prefixes, exception classes with `Exception` suffixes, and test classes as the tested class name plus `Test`.
- Put brackets next to the type for arrays: `String[] args`, not `String args[]`.
- Do not prefix POJO boolean properties with `is`; frameworks may mis-detect the property name. Map database `is_xxx` fields explicitly.
- Package names must be lowercase, singular, dot-separated, and each segment should be one natural English word.
- Avoid nonstandard abbreviations that hide meaning.

Recommended/reference:

- Prefer complete words for self-explanatory names.
- If a module, interface, class, or method uses a design pattern, reflect the pattern in the name, such as `OrderFactory`, `LoginProxy`, or `ResourceObserver`.
- Interface methods and fields should omit redundant `public` modifiers and include useful Javadoc.
- For `Service` and `DAO`, expose interfaces and name implementations with `Impl`.
- Capability interfaces may use adjective names such as `Translatable`.
- Enum class names may end with `Enum`; enum members use uppercase underscores.
- Layer method prefixes: `get` for one object, `list` for multiple objects, `count`, `save`/`insert`, `remove`/`delete`, and `update`.
- Model suffixes: `xxxDO`, `xxxDTO`, `xxxVO`; do not name a class `xxxPOJO`.

## Constants

Mandatory:

- Do not use magic values directly in code. Define named constants.
- Use uppercase `L` for `long`/`Long` literals, never lowercase `l`.

Recommended:

- Do not keep every constant in one universal constant class. Group by function and scope.
- Choose the smallest sensible reuse scope: cross-application library, application, submodule, package, or class-local `private static final`.
- Use `enum` when values vary only within a fixed set, especially when values have attributes.

## Formatting

Mandatory:

- For non-empty blocks, put `{` on the same line, newline after `{`, newline before `}`, and keep `} else {` on one line. Empty blocks may be `{}`.
- Do not put spaces immediately inside parentheses. Put one space before `{`.
- Put one space between reserved words and `(` for `if`, `for`, `while`, `switch`, and `do`.
- Put one space around binary and ternary operators.
- Use 4 spaces for indentation; do not use tab characters.
- `//` comments must have exactly one space after the slashes.
- Keep lines at or below 120 characters. When wrapping, indent the second line 4 spaces, keep operators and dots with the following line, wrap method arguments after commas, and do not break before `(`.
- Add a space after commas in method definitions and calls.
- Use UTF-8 and Unix line endings.

Recommended:

- Keep a single method under 80 lines, including signature, braces, code, comments, blank lines, and invisible characters.
- Do not align variables by adding decorative spaces.
- Insert one blank line between different logical or business sections; avoid multiple blank lines.

## OOP And POJO

Mandatory:

- Access static members through the class name, not an object reference.
- Add `@Override` to all overridden methods.
- Use varargs only for same-type, same-meaning arguments; avoid `Object...`.
- Do not change method signatures of externally used APIs or library APIs. Deprecate old interfaces with `@Deprecated` and document replacements.
- Do not use deprecated classes or methods.
- Call `equals` on constants or known non-null objects, or use `Objects.equals`.
- Compare wrapper objects of the same type with `equals`, not `==`.
- Use wrapper types for all POJO fields and RPC parameters/returns; prefer primitive types for local variables.
- Do not set default values on DO/DTO/VO fields.
- When adding fields to serializable classes, do not change `serialVersionUID` unless the change is intentionally incompatible.
- Do not put business logic in constructors; use an init method or lifecycle hook.
- POJO classes must implement `toString`; include `super.toString()` when extending another POJO.
- Do not define both `isXxx()` and `getXxx()` for the same POJO property.

Recommended:

- Before indexing into `String.split` results, account for trailing separators.
- Keep overloaded methods and multiple constructors adjacent.
- Order methods as public/protected methods, private methods, then getters/setters, except overloaded groups.
- Setter parameter names should match field names and use `this.field = field`.
- Do not add business logic to getters or setters.
- Use `StringBuilder.append` for string concatenation inside loops.
- Use `final` for non-inheritable classes, non-overridable methods, immutable references, non-reassigned locals, or to avoid variable reuse confusion.
- Be careful with `Object.clone`; default clone is shallow.
- Minimize access scope: private constructors for non-instantiable classes, no public/default constructors in utility classes, private fields and methods unless broader access is truly required, and consider `final` for static fields.

## Collections

Mandatory:

- If overriding `equals`, also override `hashCode`.
- Objects stored in `Set` or used as `Map` keys must implement both `equals` and `hashCode`.
- Do not cast `ArrayList.subList` results to `ArrayList`; it is a view.
- Do not structurally modify the original list while iterating or changing a `subList`.
- Convert collections to arrays with `toArray(new T[list.size()])`, not raw `toArray()`.
- Do not call mutating methods on `Arrays.asList` results.
- Respect PECS: `? extends T` is for producers/readers and cannot safely accept `add`; `? super T` is for consumers/writers and cannot safely provide typed `get`.
- Do not remove/add elements inside foreach loops; use an `Iterator` and `iterator.remove()`. Lock the iterator if operations are concurrent.
- Comparators must be symmetric, transitive, and handle equality consistently.

Recommended:

- Use diamond syntax or type inference where supported.
- Specify initial collection capacity where size is known; for `HashMap`, use roughly `expectedSize / 0.75 + 1`, or default 16 when unknown.
- Iterate maps with `entrySet` or `Map.forEach` when both key and value are needed.
- Know map null support: `ConcurrentHashMap` and `Hashtable` reject null keys/values; `TreeMap` rejects null keys; `HashMap` allows null keys/values.
- Use set uniqueness to de-duplicate rather than repeated `List.contains`.

## Concurrency

Mandatory:

- Singleton acquisition and singleton methods must be thread-safe.
- Name threads and thread pools meaningfully.
- Provide thread resources through thread pools; do not create raw application threads casually.
- Do not create production thread pools through `Executors`; use `ThreadPoolExecutor` so queue size, thread count, rejection policy, and resource limits are explicit.
- Do not use static `SimpleDateFormat` without synchronization. Prefer `DateTimeFormatter`/`java.time`, `ThreadLocal`, or a safe date utility.
- In high concurrency, minimize lock cost: prefer lock-free structures, small locked blocks, and object locks over class locks where suitable.
- Keep a consistent lock acquisition order across resources to avoid deadlock.
- For concurrent updates to one record, use application/cache locks or database optimistic locks with a `version` field; retry optimistic locks at least 3 times.
- Prefer `ScheduledExecutorService` over `Timer` for multiple scheduled tasks, because one uncaught `TimerTask` exception stops other tasks.

Recommended/reference:

- With `CountDownLatch`, call `countDown` in `finally` or otherwise guarantee it runs even on exceptions.
- Prefer `ThreadLocalRandom` over shared `Random`/`Math.random` in concurrent code.
- If using double-checked locking on JDK 5+, declare the target field `volatile`.
- `volatile` solves visibility for one writer/many readers but not compound writes; use `AtomicInteger`, `AtomicLong`, or `LongAdder` for counters.
- Avoid unsynchronized high-concurrency `HashMap` resizing; use concurrent collections or locking.
- Declare `ThreadLocal` fields as `static` when the per-thread value should be shared by all instances of the class.

## Control Flow And Parameters

Mandatory:

- Every `switch` case must end with `break`, `return`, or a comment explaining fallthrough. Every `switch` must have a final `default`.
- Always use braces for `if`, `else`, `for`, `while`, and `do`, even for one line.
- In high-concurrency exit logic, avoid equality-only checks; prefer range checks that cannot be skipped by concurrent changes.
- Do not exceed 3 levels of `if/else`; use guard clauses, strategy, or state pattern.

Recommended:

- Prefer guard clauses for exceptional branches.
- Do not put complex expressions inside conditions. Assign them to well-named boolean variables first.
- Move object creation, connection acquisition, unnecessary try/catch, and other expensive operations outside loops where possible.
- Avoid negated logic when an equivalent positive condition is available.
- Protect interface parameters, especially batch operations.
- Validate parameters for low-frequency, expensive, high-stability, external, or sensitive-permission methods.
- You may omit repeated validation for hot private or low-level methods only when callers have already validated and method docs state the expectation.

## Comments And General Rules

Mandatory:

- Use Javadoc (`/** ... */`) for classes, fields, and methods. Do not use `//` as class or method API documentation.
- Abstract methods and interface methods need Javadoc explaining purpose, parameters, returns, exceptions, and implementation notes.
- Classes must include creator and creation date if the repository convention requires Alibaba manual compliance; otherwise follow local project header policy.
- Place single-line comments above the code they explain. Align multi-line block comments with code.
- Every enum value must have a comment explaining its purpose.
- Precompile regular expressions; do not call `Pattern.compile` repeatedly inside method bodies.
- Use `System.currentTimeMillis()` for current milliseconds, not `new Date().getTime()`. Use `System.nanoTime()` for elapsed time measurement; Java 8 may use `Instant`.

Recommended/reference:

- Prefer clear Chinese comments over awkward English; keep technical terms in English.
- Update comments when changing parameters, returns, exceptions, or core logic.
- Delete dead code. If temporarily commenting code, explain why above it.
- Keep comments concise and focused on design intent, business meaning, and non-obvious logic.
- Mark `TODO`/`FIXME` with owner, date, and expected handling time when possible.
- Do not put complex logic in view templates.
- Specify data structure capacity where possible.
