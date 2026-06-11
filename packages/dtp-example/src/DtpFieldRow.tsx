import {
  Component,
  createMemo,
  createSignal,
  onCleanup,
  Show,
  type JSX,
} from "solid-js";
import { Portal } from "solid-js/web";
import { DateTimePicker, parseDateTimeFieldValue } from "@arminmajerie/dtp-solid";

import { computePopupPosition, type PopupPlacement } from "./anchorPosition";

const POPUP_WIDTH = 432;
const POPUP_ESTIMATED_HEIGHT = 520;

export interface DtpPickerConfig {
  dateFormat: string;
  enableTimeView: boolean;
  enableTimeEditing: boolean;
  allowPeriod: boolean;
  closeOnSelect: boolean;
  enableTodayNavigator: boolean;
  enableCalendarViewType: boolean;
  activeCalendarView: "day" | "month" | "year";
  enableDateInputField: boolean;
  enableDateInputFieldEditor: boolean;
  enableArrowNavigation: boolean;
  calendarWidth: number;
}

export interface DtpFieldRowProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  formatValue: (response: {
    currentDate?: Date;
    startDate?: Date;
    endDate?: Date;
  }) => string;
  pickerConfig: DtpPickerConfig;
}

interface PickerSeed {
  currentDate: Date;
  prevDate: Date;
  defaultPeriodEnabled: boolean;
}

const CalendarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export const DtpFieldRow: Component<DtpFieldRowProps> = (props) => {
  const [open, setOpen] = createSignal(false);
  const [pickerSeed, setPickerSeed] = createSignal<PickerSeed | null>(null);
  const [pos, setPos] = createSignal({
    left: 0,
    top: 0,
    arrowLeft: 24,
    maxHeight: undefined as number | undefined,
  });
  const [placement, setPlacement] = createSignal<PopupPlacement>("above");

  let btnRef: HTMLButtonElement | undefined;
  let popupRef: HTMLDivElement | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let pickerInitialized = false;
  let previousActiveView: string | undefined;

  const computePosition = () => {
    if (!btnRef) return;
    const measured = popupRef?.scrollHeight || POPUP_ESTIMATED_HEIGHT;
    const next = computePopupPosition(
      btnRef.getBoundingClientRect(),
      POPUP_WIDTH,
      measured,
      true,
    );
    setPos({
      left: next.left,
      top: next.top,
      arrowLeft: next.arrowLeft,
      maxHeight: next.maxHeight,
    });
    setPlacement(next.placement);
  };

  const close = () => {
    setOpen(false);
    setPickerSeed(null);
    pickerInitialized = false;
    previousActiveView = undefined;
    resizeObserver?.disconnect();
    resizeObserver = undefined;
    document.removeEventListener("mousedown", handleClickOutside);
    window.removeEventListener("resize", onWindowChange);
    window.removeEventListener("scroll", onWindowChange, true);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (!open()) return;
    const target = event.target as Node;
    if (popupRef?.contains(target)) return;
    if (btnRef?.contains(target)) return;
    close();
  };

  const onWindowChange = () => {
    if (open()) computePosition();
  };

  const attachPositionObservers = () => {
    if (popupRef && typeof ResizeObserver !== "undefined") {
      resizeObserver?.disconnect();
      resizeObserver = new ResizeObserver(() => computePosition());
      resizeObserver.observe(popupRef);
    }
    computePosition();
    requestAnimationFrame(() => computePosition());
  };

  onCleanup(() => close());

  const toggle = (event: MouseEvent) => {
    event.stopPropagation();
    if (open()) {
      close();
      return;
    }

    const parsed = parseDateTimeFieldValue(props.value, cfg().dateFormat);
    setPickerSeed({
      currentDate: parsed.endDate,
      prevDate: parsed.startDate ?? parsed.endDate,
      defaultPeriodEnabled: parsed.isPeriod && cfg().allowPeriod,
    });
    setOpen(true);
    requestAnimationFrame(() => {
      attachPositionObservers();
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("resize", onWindowChange);
      window.addEventListener("scroll", onWindowChange, true);
    });
  };

  const popupStyle = createMemo((): JSX.CSSProperties => {
    const p = pos();
    const base: JSX.CSSProperties = {
      position: "fixed",
      left: `${p.left}px`,
      top: `${p.top}px`,
      width: `${POPUP_WIDTH}px`,
      "z-index": "2147483647",
      "pointer-events": "auto",
      "--arrow-left": `${p.arrowLeft}px`,
    };
    if (p.maxHeight != null) {
      base["--popup-max-height"] = `${p.maxHeight}px`;
    }
    if (placement() === "above") {
      return { ...base, transform: "translate(-50%, -100%)" };
    }
    return { ...base, transform: "translate(-50%, 0)" };
  });

  const bodyScrollClass = () =>
    pos().maxHeight != null ? "dtp-anchor-popup__body--scroll" : "";

  const arrowClass = () =>
    placement() === "above"
      ? "dtp-anchor-popup__arrow dtp-anchor-popup__arrow--down"
      : "dtp-anchor-popup__arrow dtp-anchor-popup__arrow--up";

  const cfg = () => props.pickerConfig;
  const seed = () => pickerSeed();

  const handleCalendarResponse = (response: {
    activeView: string;
    currentDate?: Date;
    startDate?: Date;
    endDate?: Date;
    setCalendarState: (open: boolean) => void;
  }) => {
    response.setCalendarState(true);

    if (!pickerInitialized) {
      pickerInitialized = true;
      previousActiveView = response.activeView;
      return;
    }

    if (response.activeView !== previousActiveView) {
      previousActiveView = response.activeView;
      return;
    }

    const formatted = props.formatValue({
      currentDate: response.currentDate,
      startDate: response.startDate,
      endDate: response.endDate,
    });
    if (!formatted) return;

    props.onValueChange(formatted);

    if (cfg().closeOnSelect && response.activeView === "day") {
      close();
    }
  };

  return (
    <>
      <div class="ib-row">
        <span class="ib-row__label">{props.label}</span>
        <div class="ib-row__controls">
          <button
            ref={btnRef}
            type="button"
            class="ib-calendar-btn"
            classList={{ "ib-calendar-btn--open": open() }}
            onClick={toggle}
            title={`Open date/time picker for ${props.label}`}
          >
            <CalendarIcon />
          </button>
          <input class="ib-field" type="text" readOnly placeholder="Select a date…" value={props.value} />
        </div>
      </div>

      <Portal mount={document.body}>
        <Show when={open() && seed()}>
          {(activeSeed) => (
            <div
              ref={(el) => {
                popupRef = el;
                if (open()) attachPositionObservers();
              }}
              class="dtp-anchor-popup"
              style={popupStyle()}
            >
              <div class={`dtp-anchor-popup__body ${bodyScrollClass()}`}>
                <DateTimePicker
                currentDate={activeSeed().currentDate}
                prevDate={activeSeed().prevDate}
                dateFormat={cfg().dateFormat}
                enableTimeView={cfg().enableTimeView}
                enableTimeEditing={cfg().enableTimeEditing}
                enableDateRangeSelector={cfg().allowPeriod}
                defaultPeriodEnabled={activeSeed().defaultPeriodEnabled}
                closeOnSelect={cfg().closeOnSelect}
                enableTodayNavigator={cfg().enableTodayNavigator}
                enableCalendarViewType={cfg().enableCalendarViewType}
                activeCalendarView={cfg().activeCalendarView}
                enableDateInputField={cfg().enableDateInputField}
                enableDateInputFieldEditor={cfg().enableDateInputFieldEditor}
                enableArrowNavigation={cfg().enableArrowNavigation}
                calendarWidth={cfg().calendarWidth}
                hideToggler={true}
                defaultOpen={true}
                calendarResponse={handleCalendarResponse}
              />
              </div>
              <div class={arrowClass()} aria-hidden="true" />
            </div>
          )}
        </Show>
      </Portal>
    </>
  );
};
