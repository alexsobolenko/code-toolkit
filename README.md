# Advanced Code Toolkit

Advanced Code Toolkit is a Visual Studio Code extension project focused on making everyday development work simpler and more convenient.

The project is intended to collect small, practical tools that reduce repetitive actions, improve the editing flow, and help developers stay focused on writing and maintaining code.

## Project Goals

- Provide lightweight utilities for common development tasks.
- Keep workflows simple, predictable, and easy to use inside Visual Studio Code.
- Avoid unnecessary complexity while improving day-to-day productivity.
- Grow gradually as useful tooling ideas become stable enough to include.

## Development Status

This project is an early-stage extension scaffold. Features and behavior may change as the toolkit takes shape.

## Features

### Toggle Quotes

Use command `Advanced code toolkit. Toggle quotes` to switch quotes around the cursor or selected text.

![Example](https://raw.githubusercontent.com/alexsobolenko/code-toolkit/master/assets/gifs/toggle-quotes.gif)

The quote order is controlled by `advanced-code-toolkit.toggle-quotes.quotes-order`.

Default order:

```json
{
    "advanced-code-toolkit.toggle-quotes.quotes-order": ["'", "\"", "`"]
}
```

### Toggle Case

Use command `Advanced code toolkit. Toggle case` to transform the current word or selected text.

![Example](https://raw.githubusercontent.com/alexsobolenko/code-toolkit/master/assets/gifs/toggle-case.gif)

Available transformations:

- `camel`
- `constant`
- `dot`
- `kebab`
- `lower`
- `lowerFirst`
- `pascal`
- `path`
- `sentence`
- `snake`
- `swap`
- `title`
- `upper`
- `upperFirst`

Each transformation is also available as a separate command, for example `Advanced code toolkit. Toggle case 'camel'`.

### Toggle Multiline Expression

Use command `Advanced code toolkit. Toggle multiline expression` to switch the nearest supported expression between one-line and multiline formatting.

The command is currently focused on PHP, JavaScript, and TypeScript. Other languages may work in simple cases, but problems are possible because every language has its own syntax rules. Support for languages outside PHP, JavaScript, and TypeScript needs language-specific refinement.

Supported expression types:

- function and method calls;
- function and method declarations;
- arrays;
- objects.

PHP examples:

```php
$items = ['first', 'second', 'third'];
```

```php
$items = [
    'first',
    'second',
    'third',
];
```

```php
$result = buildResponse($status, $payload, $headers);
```

```php
$result = buildResponse(
    $status,
    $payload,
    $headers
);
```

JavaScript examples:

```js
const user = {id: 1, name: 'Alex', active: true};
```

```js
const user = {
    id: 1,
    name: 'Alex',
    active: true,
};
```

```js
const result = createUser(id, name, options);
```

```js
const result = createUser(
    id,
    name,
    options
);
```

Trailing commas are controlled by separate settings:

```json
{
    "advanced-code-toolkit.toggle-multiline-expression.function-trailing-comma": false,
    "advanced-code-toolkit.toggle-multiline-expression.array-trailing-comma": true,
    "advanced-code-toolkit.toggle-multiline-expression.object-trailing-comma": true
}
```

The command avoids collapsing expressions with line comments because moving them into one line can change the meaning of the code.
