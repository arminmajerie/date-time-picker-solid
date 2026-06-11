import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

export interface ParsedDateTimeFieldValue {
	endDate: Date;
	startDate?: Date;
	isPeriod: boolean;
}

function parseOne(value: string, format?: string): Date | undefined {
	const trimmed = value.trim();
	if (!trimmed) return undefined;

	if (format) {
		const withFormat = dayjs(trimmed, format, true);
		if (withFormat.isValid()) return withFormat.toDate();
	}

	const parsed = dayjs(trimmed);
	if (parsed.isValid()) return parsed.toDate();

	const native = new Date(trimmed);
	if (!Number.isNaN(native.getTime())) return native;

	return undefined;
}

/** Parse a field value (single datetime or period range) into picker seed dates. */
export function parseDateTimeFieldValue(
	fieldValue: string,
	dateFormat?: string,
): ParsedDateTimeFieldValue {
	const trimmed = fieldValue.trim();
	const fallback = new Date();

	if (!trimmed) {
		return { endDate: fallback, isPeriod: false };
	}

	const periodParts = trimmed.split(/\s*(?:→|->)\s*/);
	if (periodParts.length === 2) {
		const start = parseOne(periodParts[0], dateFormat);
		const end = parseOne(periodParts[1], dateFormat);
		if (start && end) {
			return { endDate: end, startDate: start, isPeriod: true };
		}
	}

	const single = parseOne(trimmed, dateFormat);
	return { endDate: single ?? fallback, isPeriod: false };
}
