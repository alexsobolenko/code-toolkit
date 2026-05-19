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
