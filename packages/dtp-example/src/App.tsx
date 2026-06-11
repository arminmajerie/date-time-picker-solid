import { createMemo, createSignal, type Component } from "solid-js";
import dayjs from "dayjs";

import {
  CUSTOM_FORMAT_VALUE,
  OUTPUT_FORMAT_PRESETS,
} from "./formats";
import { DtpFieldRow, type DtpPickerConfig } from "./DtpFieldRow";

type CalendarView = "day" | "month" | "year";

interface PickerResponse {
  currentDate?: Date;
  startDate?: Date;
  endDate?: Date;
}

const App: Component = () => {
  const [enableTimeView, setEnableTimeView] = createSignal(false);
  const [enableTimeEditing, setEnableTimeEditing] = createSignal(false);
  const [allowPeriod, setAllowPeriod] = createSignal(true);
  const [closeOnSelect, setCloseOnSelect] = createSignal(false);
  const [enableTodayNavigator, setEnableTodayNavigator] = createSignal(false);
  const [enableCalendarViewType, setEnableCalendarViewType] = createSignal(true);
  const [activeCalendarView, setActiveCalendarView] = createSignal<CalendarView>("day");
  const [enableDateInputField, setEnableDateInputField] = createSignal(true);
  const [enableDateInputFieldEditor, setEnableDateInputFieldEditor] = createSignal(true);
  const [enableArrowNavigation, setEnableArrowNavigation] = createSignal(true);
  const [calendarWidth, setCalendarWidth] = createSignal(22);

  const [outputFormatPreset, setOutputFormatPreset] = createSignal("YYYY-MM-DDTHH:mm:ss");
  const [customOutputFormat, setCustomOutputFormat] = createSignal("");

  const [topFieldValue, setTopFieldValue] = createSignal("");
  const [bottomFieldValue, setBottomFieldValue] = createSignal("");

  const resolvedOutputFormat = createMemo(() => {
    if (outputFormatPreset() === CUSTOM_FORMAT_VALUE) {
      return customOutputFormat().trim() || "YYYY-MM-DDTHH:mm:ss";
    }
    return outputFormatPreset();
  });

  const pickerConfig = createMemo((): DtpPickerConfig => ({
    dateFormat: resolvedOutputFormat(),
    enableTimeView: enableTimeView(),
    enableTimeEditing: enableTimeEditing(),
    allowPeriod: allowPeriod(),
    closeOnSelect: closeOnSelect(),
    enableTodayNavigator: enableTodayNavigator(),
    enableCalendarViewType: enableCalendarViewType(),
    activeCalendarView: activeCalendarView(),
    enableDateInputField: enableDateInputField(),
    enableDateInputFieldEditor: enableDateInputFieldEditor(),
    enableArrowNavigation: enableArrowNavigation(),
    calendarWidth: calendarWidth(),
  }));

  const formatPickerValue = (value: PickerResponse) => {
    const format = resolvedOutputFormat();
    if (value.startDate && value.endDate) {
      if (value.startDate.getTime() === value.endDate.getTime()) {
        return dayjs(value.startDate).format(format);
      }
      return `${dayjs(value.startDate).format(format)} → ${dayjs(value.endDate).format(format)}`;
    }
    if (value.currentDate) {
      return dayjs(value.currentDate).format(format);
    }
    return "";
  };

  return (
    <div class="splash">
      <header class="splash__header">
        <h1>Date Time Picker — Playground</h1>
        <p>
          Popup anchors to the calendar button (like FieldTooltip). Each row opens its own picker above
          or below the field it belongs to.
        </p>
      </header>

      <div class="splash__layout">
        <aside class="panel panel--controls">
          <section class="panel__section">
            <h2>Output Format</h2>
            <p class="field-note">
              This is what appears in the text field and inside the calendar date input with the
              left/right arrows. Use Day / Month / Year mode to choose what the arrows adjust.
            </p>
            <label class="field">
              <span>Output / field format</span>
              <select
                value={outputFormatPreset()}
                onChange={(e) => setOutputFormatPreset(e.currentTarget.value)}
              >
                {OUTPUT_FORMAT_PRESETS.map((preset) => (
                  <option value={preset.value}>{preset.label} — {preset.value}</option>
                ))}
                <option value={CUSTOM_FORMAT_VALUE}>Custom…</option>
              </select>
            </label>
          </section>

          <section class="panel__section">
            <h2>Feature Toggles</h2>
            <div class="checkbox-grid">
              <label class="checkbox">
                <input type="checkbox" checked={enableTimeView()} onChange={(e) => setEnableTimeView(e.currentTarget.checked)} />
                Enable Time View
              </label>
              <label class="checkbox">
                <input type="checkbox" checked={enableTimeEditing()} onChange={(e) => setEnableTimeEditing(e.currentTarget.checked)} />
                Enable Time Editing
              </label>
              <label class="checkbox">
                <input type="checkbox" checked={allowPeriod()} onChange={(e) => setAllowPeriod(e.currentTarget.checked)} />
                Allow Period checkbox in calendar
              </label>
              <label class="checkbox">
                <input type="checkbox" checked={closeOnSelect()} onChange={(e) => setCloseOnSelect(e.currentTarget.checked)} />
                Close On Select
              </label>
              <label class="checkbox">
                <input type="checkbox" checked={enableTodayNavigator()} onChange={(e) => setEnableTodayNavigator(e.currentTarget.checked)} />
                Enable Today Navigator
              </label>
              <label class="checkbox">
                <input type="checkbox" checked={enableCalendarViewType()} onChange={(e) => setEnableCalendarViewType(e.currentTarget.checked)} />
                Enable Calendar View Type
              </label>
              <label class="checkbox">
                <input type="checkbox" checked={enableDateInputField()} onChange={(e) => setEnableDateInputField(e.currentTarget.checked)} />
                Enable Date Input Field
              </label>
              <label class="checkbox">
                <input type="checkbox" checked={enableDateInputFieldEditor()} onChange={(e) => setEnableDateInputFieldEditor(e.currentTarget.checked)} />
                Enable Date Input Field Editor
              </label>
              <label class="checkbox">
                <input type="checkbox" checked={enableArrowNavigation()} onChange={(e) => setEnableArrowNavigation(e.currentTarget.checked)} />
                Enable Arrow Navigation
              </label>
            </div>
          </section>

          <section class="panel__section">
            <h2>Calendar Options</h2>
            <label class="field">
              <span>Active Calendar View</span>
              <select
                value={activeCalendarView()}
                onChange={(e) => setActiveCalendarView(e.currentTarget.value as CalendarView)}
              >
                <option value="year">Year</option>
                <option value="month">Month</option>
                <option value="day">Day</option>
              </select>
            </label>
            <label class="field">
              <span>Calendar Width (rem)</span>
              <input
                type="number"
                min={10}
                max={40}
                step={1}
                value={calendarWidth()}
                onInput={(e) => setCalendarWidth(Number(e.currentTarget.value) || 22)}
              />
            </label>
          </section>
        </aside>

        <main class="panel panel--preview">
          <h2>Live Preview</h2>

          <DtpFieldRow
            label="DTP Test:"
            value={topFieldValue()}
            onValueChange={setTopFieldValue}
            formatValue={formatPickerValue}
            pickerConfig={pickerConfig()}
          />

          <div class="preview-spacer" aria-hidden="true">
            <p>Scroll down — second field at the bottom behaves the same way.</p>
          </div>

          <DtpFieldRow
            label="DTP Test (bottom):"
            value={bottomFieldValue()}
            onValueChange={setBottomFieldValue}
            formatValue={formatPickerValue}
            pickerConfig={pickerConfig()}
          />
        </main>
      </div>
    </div>
  );
};

export default App;
