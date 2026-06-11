# date-time-picker-solid

Monorepo for the SolidJS Date Time Picker component.

## Packages

| Package | Description |
|---------|-------------|
| `@arminmajerie/dtp-solid` | Library — publishable date/time picker component |
| `dtp-example` | Interactive playground with all configuration options |

## Development

```sh
npm install
npm run dev
```

Opens the example playground at http://localhost:3000.

## Build

```sh
# Build library only
npm run build

# Build library + example
npm run build:all
```

## Usage

```tsx
import { DateTimePicker } from "@arminmajerie/dtp-solid";
import "@arminmajerie/dtp-solid/style.css";

<DateTimePicker currentDate={new Date()} dateFormat="YYYY-MM-DD" />
```
