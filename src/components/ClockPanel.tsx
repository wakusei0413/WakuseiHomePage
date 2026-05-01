import { createSignal, onCleanup, onMount } from 'solid-js';

import { formatDateParts, formatTimeString } from '../lib/time';
import type { I18nContext } from '../lib/i18n';
import type { TimeConfig } from '../types/site';

export function ClockPanel(props: { config: TimeConfig; i18n: I18nContext }) {
    const [now, setNow] = createSignal(new Date());

    onMount(() => {
        const timer = window.setInterval(() => {
            setNow(new Date());
        }, props.config.updateInterval);

        onCleanup(() => {
            window.clearInterval(timer);
        });
    });

    const dateParts = () => formatDateParts(now(), props.i18n.locale());

    return (
        <div class="time-widget">
            {props.config.showWeekday ? <div class="weekday">{dateParts().weekday}</div> : null}
            {props.config.showDate ? <div class="date-display">{dateParts().dateDisplay}</div> : null}
            <div class="clock">{formatTimeString(now(), props.config.format)}</div>
        </div>
    );
}