export const OUTPUT_FORMAT_PRESETS = [
  { label: "ISO Date", value: "YYYY-MM-DD" },
  { label: "European", value: "DD/MM/YYYY" },
  { label: "US", value: "MM/DD/YYYY" },
  { label: "European Dashes", value: "DD-MM-YYYY" },
  { label: "ISO Slashes", value: "YYYY/MM/DD" },
  { label: "Short Month", value: "DD MMM, YYYY" },
  { label: "US Short Month", value: "MMM DD, YYYY" },
  { label: "Long Month", value: "MMMM D, YYYY" },
  { label: "Full Weekday", value: "dddd, MMMM D, YYYY" },
  { label: "ISO DateTime", value: "YYYY-MM-DD HH:mm:ss" },
  { label: "ISO 8601", value: "YYYY-MM-DDTHH:mm:ss" },
  { label: "ISO 8601 UTC", value: "YYYY-MM-DDTHH:mm:ss[Z]" },
  { label: "European DateTime", value: "DD/MM/YYYY HH:mm" },
  { label: "US 12h DateTime", value: "MM/DD/YYYY hh:mm A" },
  { label: "ISO Date + Time", value: "YYYY-MM-DD HH:mm" },
  { label: "Time 24h", value: "HH:mm:ss" },
  { label: "Time 12h", value: "hh:mm A" },
  { label: "Compact", value: "YYYYMMDD" },
  { label: "ISO Milliseconds", value: "YYYY-MM-DD HH:mm:ss.SSS" },
  { label: "Weekday Short", value: "ddd, DD MMM YYYY HH:mm" },
] as const;

export const DISPLAY_FORMAT_PRESETS = [
  "YYYY-MM-DD",
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "DD MMM, YYYY",
  "MMMM D, YYYY",
  "YYYY-MM-DD HH:mm",
  "MM/DD/YYYY hh:mm A",
] as const;

export const CUSTOM_FORMAT_VALUE = "__custom__";
