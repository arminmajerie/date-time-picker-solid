import { createEffect, createMemo, createSignal, createUniqueId, mergeProps, type JSXElement } from "solid-js";
import './assets/stylesheets/base.scss';
import { monthList, viewList, weekDays } from "./utils/constant";
import dayjs from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

import arrowIcon from './assets/icons/arrow.svg';
import clockLogo from './assets/icons/clock.svg';
import calendarLogo from './assets/icons/calendar.svg';
import calendarClockLogo from './assets/icons/calendarClock.svg'

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

interface IPropsValue {
	activeView: string;
	startDate?: Date;
	endDate?: Date;
	currentDate?: Date;
	dateRangeDifference: number;
	date: string;
	month: string;
	year: string;
	day: string;
	time: string;
	currentWeekStartDate: Date;
	currentWeekEndDate: Date;
	setCalendarState: (props: boolean) => void;
}

interface ICalendarComponentProps {
	dateFormat?: string;
	customizeRangeSelectedDates?: string;
	customizeCalendar?: string;
	customizeCalendarToggler?: string;
	customizeTogglerArrowIcon?: string;
	customizeTogglerCalendarIcon?: string;
	customizeCalendarBody?: string;
	prevDate?: Date;
	minDate?: Date;
	maxDate?: Date;
	enableDateRangeSelector?: boolean;
	currentDate: Date | string;
	headerMonthFormat?: string;
	headerYearFormat?: string;
	enableArrowNavigation?: boolean;
	enableDateInputField?: boolean;
	enableDateInputFieldEditor?: boolean;
	enableTodayNavigator?: boolean;
	customizeSelectedDate?: string;
	customizeLeftArrow?: string;
	customizeRightArrow?: string;
	customizeActiveMonth?: string;
	customizeTodayNavigator?: string;
	activeCalendarView?: 'day' | 'month' | 'year';
	cutomizeCalendarViewButtons?: string;
	enableCalendarViewType?: boolean;
	customizeListView?: string;
	customizeListHeader?: string;
	customizeYearLeftNavigationArrow?: string;
	customizeYearRightNavigationArrow?: string;
	enableTimeView?: boolean;
	enableTimeEditing?: boolean;
	ednableTimeEditing?: boolean;
	customizeTimeViewSwitch?: string;
	customizeTimeInputField?: string;
	customizeTimeUpdateButton?: string;
	customizeConsolidateTimeView?: string;
	customizeTimeDownArrow?: string;
	customizeTimeUpArrow?: string;
	renameTimeUpdateButton?: string;
	customizeUpdateCalenderIcon?: string;
	closeOnSelect?: boolean;
	children?: JSXElement;
	calendarResponse?: (props: IPropsValue) => void;
	calendarWidth?: number;
	hideToggler?: boolean;
	defaultOpen?: boolean;
	/** When true with range selector enabled, opens in Period mode using prevDate → currentDate. */
	defaultPeriodEnabled?: boolean;
}

export const DateTimePicker = (props: ICalendarComponentProps) => {
	const p = mergeProps(
		{
			customizeTogglerCalendarIcon: '',
			enableDateRangeSelector: false,
			prevDate: dayjs().startOf('weeks').toDate(),
			customizeRangeSelectedDates: '',
			closeOnSelect: false,
			customizeCalendar: '',
			customizeCalendarToggler: '',
			customizeTogglerArrowIcon: '',
			customizeCalendarBody: '',
			calendarWidth: 0,
			headerMonthFormat: 'MMM',
			headerYearFormat: 'YYYY',
			enableArrowNavigation: true,
			customizeLeftArrow: '',
			customizeRightArrow: '',
			customizeActiveMonth: '',
			enableDateInputField: false,
			enableDateInputFieldEditor: true,
			dateFormat: 'DD MMM, YYYY',
			customizeSelectedDate: '',
			enableTodayNavigator: false,
			customizeTodayNavigator: '',
			cutomizeCalendarViewButtons: '',
			activeCalendarView: 'day' as const,
			enableCalendarViewType: false,
			customizeListView: '',
			customizeListHeader: '',
			customizeYearLeftNavigationArrow: '',
			customizeYearRightNavigationArrow: '',
			enableTimeView: false,
			ednableTimeEditing: false,
			customizeTimeViewSwitch: '',
			customizeTimeInputField: '',
			customizeTimeUpdateButton: '',
			customizeConsolidateTimeView: '',
			customizeTimeDownArrow: '',
			customizeTimeUpArrow: '',
			customizeUpdateCalenderIcon: '',
			renameTimeUpdateButton: '',
			hideToggler: false,
			defaultOpen: false,
			defaultPeriodEnabled: false,
		},
		props,
	);

	const isTimeEditingEnabled = () => p.enableTimeEditing ?? p.ednableTimeEditing;
	const periodGroupName = createUniqueId();

	const [locDate, setLocDate] = createSignal<Date | undefined>();

	const [previousDateState, setPreviousDate] = createSignal<Date | undefined>();

	const [dateRangeArr, setdateRangeArr] = createSignal<Date[]>([]);

	const [headerView, setHeaderView] = createSignal<{ [key: string]: number | string }>({ monthIndex: 0, month: '', year: 0 });

	const [activeView, setActiveView] = createSignal<string>(p.activeCalendarView);

	const [yearRangeOffset, setYearRangeOffset] = createSignal({ start: Number(dayjs(p.currentDate).format('YYYY')) - 4, offset: 0 });

	const [isTimeViewEnabled, setTimeView] = createSignal(false);

	const [timeValue, setTime] = createSignal<{ [key: string]: string }>({ hour: '', min: '', meridiem: '' })

	const [isCalendarEnabled, setCalendarState] = createSignal(p.defaultOpen);

	type PeriodEndpoint = 'from' | 'to';

	const [periodEnabled, setPeriodEnabled] = createSignal(p.defaultPeriodEnabled ?? false);
	const [periodEndpoint, setPeriodEndpoint] = createSignal<PeriodEndpoint>('from');

	const isPeriodActive = () => p.enableDateRangeSelector && periodEnabled();

	const getActiveEditDate = (): Date => {
		if (isPeriodActive() && periodEndpoint() === 'from') {
			return previousDateState() ?? locDate() ?? dayjs(p.currentDate).toDate();
		}
		return locDate() ?? previousDateState() ?? dayjs(p.currentDate).toDate();
	};

	const syncRangeArr = () => {
		const from = previousDateState();
		const to = locDate();
		if (from && to) {
			setdateRangeArr([from, to]);
		}
	};

	const periodStatusHint = createMemo(() => {
		if (!isPeriodActive()) return '';
		const label = periodEndpoint() === 'from' ? 'From' : 'To';
		return `Editing ${label}: ${dayjs(getActiveEditDate()).format(p.dateFormat)}`;
	});

	const syncTimeFromDate = (date: Date | undefined) => {
		if (!date) return;
		setTime({
			hour: momentFormatter(date, 'HH'),
			min: momentFormatter(date, 'mm'),
			meridiem: momentFormatter(date, 'A'),
		});
	};

	const applyTimeToDate = (base: Date | undefined, hour: string, min: string) => {
		const next = dayjs(base ?? new Date()).toDate();
		next.setHours(Number(hour));
		next.setMinutes(Number(min));
		next.setSeconds(0);
		next.setMilliseconds(0);
		return next;
	};

	const setActiveEditDate = (date: Date) => {
		if (isPeriodActive()) {
			if (periodEndpoint() === 'from') {
				setPreviousDate(date);
			} else {
				setLocDate(date);
			}
			syncRangeArr();
			return;
		}
		setLocDate(date);
	};

	const togglePeriod = (enabled: boolean) => {
		if (enabled) {
			const selected = locDate() ?? dayjs(p.currentDate).toDate();
			setPreviousDate(selected);
			setLocDate(selected);
			setdateRangeArr([selected, selected]);
			setPeriodEndpoint('from');
			yearViewNavigation(selected);
		} else {
			const keep = previousDateState() ?? locDate() ?? dayjs(p.currentDate).toDate();
			setLocDate(keep);
			setPreviousDate(undefined);
			setdateRangeArr([]);
		}
		setPeriodEnabled(enabled);
	};

	createEffect(() => {
		if (p.defaultOpen) {
			setCalendarState(true);
		}
	});

	const dateList = createMemo(() => {
		const currentMonth = headerView().monthIndex;
		const currentYear = headerView().year;
		const monthStartDate = dayjs(`${currentYear}, ${currentMonth},`).startOf('month').format('DD MMMM, YYYY')

		const weekStartDate = dayjs(monthStartDate).startOf('week').toDate();

		return [...Array(42)].map((_1, index) => {
			return dayjs(weekStartDate).add(index, 'days').toDate();
		})
	})


	const splitArr = (list: Date[], splittedArr: Date[][]) => {
		const subArray: Date[] = [];
		const callbackArr: Date[][] = splittedArr;

		if (list.length > 7) {
			list.forEach((iterate, index) => {
				if (index !== 0 && (index) % 7 === 0) {
					callbackArr.push(subArray)
					const val = list.splice(7)
					splitArr(val, callbackArr)
				} else {
					subArray.push(iterate);
				}
			})
		}
		else if (list.length === 7) {
			callbackArr.push(list)
		}
		return callbackArr;
	}

	const dateListss = createMemo(() => {
		const currentMonth = headerView().monthIndex;
		const currentYear = headerView().year;
		const monthStartDate = dayjs(`${currentYear}-${currentMonth}`).startOf('month').format('DD MMMM, YYYY')

		const weekStartDate = dayjs(monthStartDate).startOf('week').toDate();

		const dateArray = [...Array(42)].map((_1, index) => {
			return dayjs(weekStartDate).add(index, 'days').toDate();
		})

		return splitArr(dateArray, [])
	})

	const momentFormatter = (date: Date | undefined, formatStr: string) => {
		return dayjs(date).format(formatStr);
	}

	createEffect(() => {
		setActiveView(p.activeCalendarView);
	});

	createEffect(() => {
		if (!p.enableTimeView && isTimeViewEnabled()) {
			setTimeView(false);
		}
	});

	// Sync external date props into internal state when the picker mounts or props change.
	createEffect(() => {
		const current = dayjs(p.currentDate);
		if (!current.isValid()) return;
		const to = current.toDate();

		if (p.enableDateRangeSelector) {
			if (p.defaultPeriodEnabled && p.prevDate) {
				const from = dayjs(p.prevDate);
				if (from.isValid()) {
					const fromDate = from.toDate();
					setPreviousDate(fromDate);
					setLocDate(to);
					setdateRangeArr([fromDate, to]);
					setPeriodEnabled(true);
					setPeriodEndpoint('from');
					yearViewNavigation(fromDate);
					return;
				}
			}
			setLocDate(to);
			if (!p.defaultPeriodEnabled) {
				setPeriodEnabled(false);
				setdateRangeArr([]);
			}
			return;
		}

		setPreviousDate(p.prevDate);
		setLocDate(to);
		setdateRangeArr([]);
		setPeriodEnabled(false);
	});

	createEffect(() => {
		if (!p.enableDateRangeSelector) {
			setPeriodEnabled(false);
		}
	});

	//  Render based on active edit date;
	createEffect(() => {
		const editDate = getActiveEditDate();
		const curentMeridiem = momentFormatter(editDate, 'A');
		setTime({
			hour: momentFormatter(editDate, 'HH'),
			min: momentFormatter(editDate, 'mm'),
			meridiem: curentMeridiem,
		});
		const month = Number(momentFormatter(editDate, 'MM'));
		setHeaderView(() => ({
			monthIndex: month,
			month: momentFormatter(editDate, p.headerMonthFormat),
			year: momentFormatter(editDate, p.headerYearFormat)
		}));
	});

	createEffect(() => {
		if (p.calendarResponse) {
			p.calendarResponse({
				activeView: activeView(),
				startDate: isPeriodActive() ? previousDateState() : undefined,
				endDate: isPeriodActive() ? locDate() : undefined,
				currentDate: isPeriodActive() ? (periodEndpoint() === 'from' ? previousDateState() : locDate()) : locDate(),
				dateRangeDifference: previousDateState() && locDate()
					? Math.abs(dayjs(locDate()).diff(dayjs(previousDateState()), 'day'))
					: 0,
				date: momentFormatter(locDate(), 'DD'),
				month: momentFormatter(locDate(), 'MM'),
				year: momentFormatter(locDate(), 'YYYY'),
				day: momentFormatter(locDate(), 'dddd'),
				time: momentFormatter(locDate(), 'hh : mm'),
				currentWeekStartDate: dayjs(locDate()).startOf('weeks').toDate(),
				currentWeekEndDate: dayjs(locDate()).endOf('weeks').toDate(),
				setCalendarState: (props) => setCalendarState(props), // to handle the calendar view open and close
			})
		}
	})

	const navigateActiveUnit = (delta: number) => {
		const base = getActiveEditDate();
		const view = activeView();
		const unit = view === 'year' ? 'year' : view === 'month' ? 'month' : 'day';
		const next = dayjs(base).add(delta, unit).toDate();
		selectCalendarDate(next);
	};

	// navigate year range during input field onchange and today onClick
	const yearViewNavigation = (value: Date) => {
		if ((yearRangeOffset().start > value.getFullYear() || ((yearRangeOffset().start + 8) < value.getFullYear()))) {
			setYearRangeOffset({ start: value.getFullYear() - 4, offset: 0 })
		}
	}

	// handles onChange in Date edit field
	const editDate = (value: string) => {
		const parsed = dayjs(value).toDate();
		if (parsed.toString() !== 'Invalid Date') {
			setActiveEditDate(parsed);
			yearViewNavigation(parsed);
		}
	}

	// handles month view selection
	const monthSelection = (selectedMonthInd: number) => {
		const activeYear = Number(headerView().year);
		const base = getActiveEditDate();
		const newDate = new Date(activeYear, selectedMonthInd - 1, base.getDate());
		if (newDate.toString() !== 'Invalid Date') {
			selectCalendarDate(newDate);
		} else {
			selectCalendarDate(new Date(activeYear, selectedMonthInd, 1));
		}
	}

	const selectCalendarDate = (date: Date) => {
		const preserved = applyTimeToDate(date, timeValue().hour || '00', timeValue().min || '00');
		setActiveEditDate(preserved);
		yearViewNavigation(preserved);
		if (!isPeriodActive() && p.closeOnSelect) {
			setCalendarState(false);
		}
	}

	// handles year view range during navigation
	const yearNavigation = (value: number) => {
		const offset = yearRangeOffset().offset + (value)
		const startYear = yearRangeOffset().start + (9 * value);
		setYearRangeOffset({ start: startYear, offset: offset })
	}

	const handleTimeChange = (value: number, key: string, range: number) => {
		const data = Number(timeValue()[key]) + value;
		if (data >= 0 && data <= range) {
			const value = data < 10 ? `0${String(data)}` : data;
			setTime({ ...timeValue(), [key]: String(value) })
		}
	}

	const isTodayEnabled = createMemo(() => {
		const today = dayjs().startOf('days').toDate();
		const seletedDate = dayjs(getActiveEditDate()).startOf('days').toDate();
		return dayjs(seletedDate).isSame(today);
	})


	const DateView = ({ it }: { it: Date }) => {
		const startDate = dayjs(`${headerView().year}, ${headerView().month}`).startOf('months').toDate();
		const endDate = dayjs(`${headerView().year}, ${headerView().month}`).endOf('months').toDate();

		let isActive = false; // gives selected dates
		let isRangeActive = false; // highlights the dates in-between
		let isDatesDisabled = false; // disables the prev date during selection 

		if (isPeriodActive()) {
			const rangeStart = previousDateState();
			const rangeEnd = locDate();

			if (rangeStart && rangeEnd) {
				isActive = dayjs(it).isSame(dayjs(rangeStart).startOf('days')) || dayjs(it).isSame(dayjs(rangeEnd).startOf('days'));
				isRangeActive = dayjs(it).isAfter(dayjs(rangeStart).startOf('days')) && dayjs(it).isBefore(dayjs(rangeEnd).startOf('days'));
			}
		} else {
			isActive = dayjs(it).isSame(dayjs(locDate()).startOf('days'));
		}

		// handles Max date given by user 
		if (p.maxDate) {
			isDatesDisabled = isDatesDisabled || dayjs(it).isSameOrAfter(dayjs(p.maxDate).startOf('days'));
		}
		if (p.minDate) {
			isDatesDisabled = isDatesDisabled || dayjs(it).isSameOrBefore(dayjs(p.minDate).startOf('days'));
		}
		return (
			<div
				class={`week-list-items cur-pointer 
													${isActive ? `${isPeriodActive() ? 'active-bg' : 'active '} box-shadow-card` : ''} 
													${p.customizeListView}
													${it < startDate || it > endDate ? 'cust-dis' : ''}
													${isRangeActive ? `bg-hover-clr ${p.customizeRangeSelectedDates}` : ''}
													${isDatesDisabled ? 'cust-dis pointer-none' : ''}
													`}
				onClick={() => selectCalendarDate(it)}
			>
				{momentFormatter(it, 'DD')}
				{dayjs(it).isSame(dayjs(new Date()).startOf('day')) ? <span class='today_highlight' /> : null}
			</div>

		)
	}

	return (
		<div class={`calendar ${p.hideToggler ? 'calendar--popup' : ''} ${p.customizeCalendar}`}>
			{p.hideToggler ? null : (
			<div
				class={`cal-initial-view cur-pointer ${p.customizeCalendarToggler}`}
				onClick={() => setCalendarState((prev) => !prev)}
				style={
					p.calendarWidth && p.calendarWidth < 29 ? { "max-width": `${p.calendarWidth}rem`, "min-width": `${p.calendarWidth}rem` } : undefined
				}
			>
				{(p.calendarWidth ? (p.calendarWidth >= 13) : true) ? <img src={calendarClockLogo} alt="clock icon" class={`${p.customizeTogglerCalendarIcon}`} /> : null}
				{isPeriodActive() && previousDateState() && locDate()
					? `${dayjs(previousDateState()).format(p.dateFormat)} → ${dayjs(locDate()).format(p.dateFormat)}`
					: dayjs(locDate()).format(p.dateFormat)}
				<img src={arrowIcon} alt="arrow icon" class={`arrow-icon ${isCalendarEnabled() ? 'rotate-arrow-icon' : ''} ${p.customizeTogglerArrowIcon}`} />
			</div>
			)}

			<div class={`cal-parent ${!isCalendarEnabled() ? 'd-none' : ''} ${p.customizeCalendarBody}`}>
				{p.enableDateRangeSelector ? (
					<div class="period-controls">
						<label class="period-controls__check">
							<input
								type="checkbox"
								checked={periodEnabled()}
								onChange={(e) => togglePeriod(e.currentTarget.checked)}
							/>
							Period
						</label>
						{periodEnabled() ? (
							<div class="period-controls__endpoints">
								<label class="period-controls__radio">
									<input
										type="radio"
										name={periodGroupName}
										checked={periodEndpoint() === 'from'}
										onChange={() => {
											setPeriodEndpoint('from');
											syncTimeFromDate(previousDateState());
											if (previousDateState()) yearViewNavigation(previousDateState()!);
										}}
									/>
									From
								</label>
								<label class="period-controls__radio">
									<input
										type="radio"
										name={periodGroupName}
										checked={periodEndpoint() === 'to'}
										onChange={() => {
											setPeriodEndpoint('to');
											syncTimeFromDate(locDate());
											if (locDate()) yearViewNavigation(locDate()!);
										}}
									/>
									To
								</label>
							</div>
						) : null}
					</div>
				) : null}
				{isPeriodActive() && periodStatusHint() ? (
					<div class="range-hint">{periodStatusHint()}</div>
				) : null}

				{p.enableTodayNavigator || p.enableDateInputField || p.enableArrowNavigation ?
					<div class={`cal-sub-header ${!p.enableTodayNavigator || !p.enableTimeView ? 'jst-center' : ''}`}>
						{p.enableTodayNavigator ?
							<button
								class={`btn-class jump-today cur-pointer ${isTodayEnabled() ? 'active' : ''} ${p.customizeTodayNavigator}`}
								onClick={() => {
									const newDate = dayjs().toDate();
									yearViewNavigation(newDate);
									setActiveEditDate(newDate);
								}}
							>
								Today
							</button> : null
						}

						<div class="cal-date-nav">
							{p.enableArrowNavigation ?
								<div
									class={`left-arrow cur-pointer ${p.customizeLeftArrow}`}
									onClick={() => navigateActiveUnit(-1)}
									title={activeView() === 'year' ? 'Previous year' : activeView() === 'month' ? 'Previous month' : 'Previous day'}
								>
									<img src={arrowIcon} alt='Previous' />
								</div>
								: null
							}

							{p.enableDateInputField ?
								<div class='today-col'>
									<input
										type='text'
										placeholder={p.dateFormat}
										class={`today-col-input ${p.customizeSelectedDate}`}
										value={momentFormatter(getActiveEditDate(), p.dateFormat)}
										readOnly={!p.enableDateInputFieldEditor}
										onKeyPress={(event: any) => {
											if (event.key === 'Enter' && event.target.value) {
												editDate(event.target.value);
											}
										}}
									/>
								</div>
								: (
									<div class={`date-val ${p.customizeSelectedDate}`}>
										{momentFormatter(getActiveEditDate(), p.dateFormat)}
									</div>
								)
							}

							{p.enableArrowNavigation ?
								<div
									class={`right-arrow cur-pointer ${p.customizeRightArrow}`}
									onClick={() => navigateActiveUnit(1)}
									title={activeView() === 'year' ? 'Next year' : activeView() === 'month' ? 'Next month' : 'Next day'}
								>
									<img src={arrowIcon} alt='Next' />
								</div>
								: null
							}
						</div>

						{p.enableTimeView ? <img
							class={`icon-height cur-pointer ${p.customizeTimeViewSwitch}`}
							src={isTimeViewEnabled() ? calendarLogo : clockLogo}
							alt='Day Time Icon'
							onClick={() => {
								const next = !isTimeViewEnabled();
								setTimeView(next);
								if (next && isPeriodActive()) {
									syncTimeFromDate(getActiveEditDate());
								}
							}}
						/> : null}
					</div> : null
				}

				{/* Calendar View sub-header */}
				{p.enableCalendarViewType ?
					<div class='cal-sub-header-section'>
						{viewList.map((it) => {
							return (
								<button
									class={`btn-class btn-width cur-pointer ${p.cutomizeCalendarViewButtons} ${it.value === activeView() ? 'active' : ''}`}
									onClick={() => {
										if (isTimeViewEnabled()) {
											setTimeView(false)
										}
										setActiveView(it.value);
									}}
								>
									{it.label}
								</button>
							)
						})}
					</div> : null}

				<div class={`main-container`}>
					{/* Month View */}
					{activeView() !== 'month' || isTimeViewEnabled() ? null :
						<div class='container-month-view'>
							{monthList.map((it, monthIndex) => {
								const editDate = getActiveEditDate();
								let isMonthDisabled = false;

								if (p.maxDate) {
									if (Number(p.maxDate.getFullYear()) < Number(editDate.getFullYear())) {
										isMonthDisabled = true;
									}
									else if (Number(p.maxDate.getFullYear()) === Number(editDate.getFullYear())) {
										isMonthDisabled = Number(p.maxDate.getMonth()) < monthIndex
									}
								}
								if (p.minDate) {
									if (Number(p.minDate.getFullYear()) > Number(editDate.getFullYear())) {
										isMonthDisabled = true;
									}
									else if (Number(p.minDate.getFullYear()) === Number(editDate.getFullYear())) {
										isMonthDisabled = isMonthDisabled || Number(p.minDate.getMonth()) > monthIndex
									}
								}

								return (
									<div
										class={`container-list cur-pointer ${p.customizeListView} ${(editDate.getMonth() + 1) === it.monthIndex ? 'active box-shadow-card' : ''} ${isMonthDisabled ? 'cust-dis pointer-none' : ''}`}
										onClick={() => monthSelection(it.monthIndex)}
									>
										{it.short}
									</div>
								)
							})}
						</div>
					}

					{/* Year View */}
					{activeView() !== 'year' || isTimeViewEnabled() ? null :
						<div class='container-year-view'>
							<img src={arrowIcon} class={`${p.customizeYearLeftNavigationArrow} year-navi__icon cur-pointer`} alt='left arrow' onClick={() => { yearNavigation(-1) }} />

							<div class='container-year-list'>
								{[...Array(9)].map((_1, index) => {
									const value = yearRangeOffset().start + index;
									const editDate = getActiveEditDate();
									const fullYear = editDate.getFullYear();
									const month = editDate.getMonth();
									const date = editDate.getDate();
									let isYearDisabled = false;
									if (p.maxDate || p.minDate) {
										isYearDisabled = (p.maxDate ? value > Number(p.maxDate.getFullYear()) : isYearDisabled) || (p.minDate ? value < Number(p.minDate.getFullYear()) : isYearDisabled);
									}

									return (
										<div
											class={`container-list cur-pointer ${p.customizeListView} ${value === fullYear ? 'active box-shadow-card' : ''} ${isYearDisabled ? 'cust-dis pointer-none' : ''}`}
											onClick={() => {
												selectCalendarDate(new Date(value, month, date));
											}}
										>
											{`${value}`}
										</div>
									)
								})}
							</div>
							<img src={arrowIcon} class={`${p.customizeYearRightNavigationArrow} year-navi__icon year-navi__icon_right cur-pointer`} alt='right arrow' onClick={() => { yearNavigation(1) }} />
						</div>
					}

					{/* Day view */}
					{activeView() !== 'day' || isTimeViewEnabled() ? null :
						<div class='container-day-view-tab'>
							<table>
								<thead>
									{weekDays.map((it) => {
										return (
											<th>
												<div class={`week-list-items pointer-none cust-dis ${p.customizeListHeader}`}>{it.short}</div>
											</th>
										)
									})}
								</thead>
								<tbody>
									{dateListss().map((iterate, index) => {
										return <tr>
											{iterate.map((it) => {
												return <td>
													<DateView it={it} />
												</td>
											})}
										</tr>
									})}
								</tbody>
							</table>

						</div>
					}
					{!isTimeViewEnabled() ? null :
						<div>
							{isPeriodActive() ? (
								<div class="range-time-target">
									<label class="period-controls__radio">
										<input
											type="radio"
											name={`${periodGroupName}-time`}
											checked={periodEndpoint() === 'from'}
											onChange={() => {
												setPeriodEndpoint('from');
												syncTimeFromDate(previousDateState());
											}}
										/>
										From
									</label>
									<label class="period-controls__radio">
										<input
											type="radio"
											name={`${periodGroupName}-time`}
											checked={periodEndpoint() === 'to'}
											onChange={() => {
												setPeriodEndpoint('to');
												syncTimeFromDate(locDate());
											}}
										/>
										To
									</label>
								</div>
							) : null}
							<div class='time-picker'>
								<div class={`time-hours-picker`}>
									<img
										src={arrowIcon}
										class={`increment-icon icon_size cur-pointer ${timeValue().hour === '00' ? 'pointer-none cust-dis' : ''} ${p.customizeTimeDownArrow}`}
										alt='hour-increment'
										onClick={() => {
											handleTimeChange(-1, 'hour', 23);
										}}
									/>
									<input
										class={`${p.customizeTimeInputField} hour_value`}
										value={timeValue().hour}
										type='number'
										readOnly={!isTimeEditingEnabled()}
										onKeyPress={(e: any) => {
											if (e.target?.value <= 24 && e.target?.value >= 0 && e.code === 'Enter') {
												const value = e.target?.value < 10 ? `0${e.target?.value}` : e.target?.value;
												setTime({ ...timeValue(), hour: value })
											}
										}}
									/>
									<img
										src={arrowIcon}
										class={`decrement-icon icon_size cur-pointer ${timeValue().hour === '23' ? 'pointer-none cust-dis' : ''} ${p.customizeTimeUpArrow}`}
										alt='hour-decrement'
										onClick={() => {
											handleTimeChange(1, 'hour', 23);
										}}
									/>
								</div>

								<div class={`time-seperator`}>:</div>
								<div class={`time-mins-picker`}>
									<img
										src={arrowIcon}
										class={`increment-icon icon_size cur-pointer ${timeValue().min === '00' ? 'pointer-none cust-dis' : ''} ${p.customizeTimeDownArrow}`}
										alt='min-increment'
										onClick={() => {
											handleTimeChange(-1, 'min', 59);
										}}
									/>
									<input
										class={`${p.customizeTimeInputField} min_value`}
										value={timeValue().min}
										type='number'
										readOnly={!isTimeEditingEnabled()}
										onKeyPress={(e: any) => {
											if (e.target?.value <= 60 && e.target?.value >= 0 && e.code === 'Enter') {
												const value = e.target?.value < 10 ? `0${e.target?.value}` : e.target?.value;
												setTime({ ...timeValue(), min: value })
											}
										}}
									/>
									<img
										src={arrowIcon}
										class={`decrement-icon icon_size cur-pointer ${timeValue().min === '59' ? 'pointer-none cust-dis' : ''} ${p.customizeTimeUpArrow}`}
										alt='min-decrement'
										onClick={() => {
											handleTimeChange(1, 'min', 59);
										}}
									/>
								</div>
							</div>
							<hr />
							<div class={`time-parent`}>
								<div class={`time-view ${p.customizeConsolidateTimeView}`}>
									<img class={`icon-height ${p.customizeUpdateCalenderIcon}`} src={calendarClockLogo} alt='Day Time Icon' />
									<div class='time-value'>
										{isPeriodActive() ? (
											<>
												<div>From: {momentFormatter(previousDateState(), p.dateFormat)} {timeValue().hour}:{timeValue().min}</div>
												<div>To: {momentFormatter(locDate(), p.dateFormat)}</div>
											</>
										) : (
											<>{momentFormatter(getActiveEditDate(), p.dateFormat)} {timeValue().hour}:{timeValue().min}</>
										)}
									</div>
								</div>
								<button
									class={`btn-class active-bg btn-width cur-pointer ${p.customizeTimeUpdateButton}`}
									onClick={() => {
										const updated = applyTimeToDate(
											getActiveEditDate(),
											timeValue().hour,
											timeValue().min,
										);

										setActiveEditDate(updated);
										if (!isTimeViewEnabled()) {
											setTimeView(false);
										}
										if (p.closeOnSelect && !isPeriodActive()) {
											setCalendarState(false);
										}
									}}
								>
									{p.renameTimeUpdateButton || 'Update'}
								</button>
							</div>
						</div>
					}
				</div>
				{
					p.children
				}
			</div>
		</div>
	)
}
