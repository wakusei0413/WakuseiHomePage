import { createSignal, onCleanup, onMount } from 'solid-js';

import { formatDateParts, formatTimeString } from '../lib/time';
import type { I18nContext } from '../lib/i18n';
import type { TimeConfig } from '../types/site';

export function ClockPanel(props: { config: TimeConfig; i18n: I18nContext }) {
    const [now, setNow] = createSignal(new Date());
    const [hasEntered, setHasEntered] = createSignal(false);

    onMount(() => {
        const timer = window.setInterval(() => {
            setNow(new Date());
        }, props.config.updateInterval);

        onCleanup(() => {
            window.clearInterval(timer);
        });

        window.setTimeout(() => setHasEntered(true), 100);
    });

    const dateParts = () => formatDateParts(now(), props.i18n.locale());

    return (
        <div class="time-widget">
            {props.config.showWeekday ? (
                <div class="weekday" classList={{ 'clock--entered': hasEntered() }}>
                    {dateParts().weekday}
                </div>
            ) : null}
            {props.config.showDate ? (
                <div class="date-display" classList={{ 'clock--entered': hasEntered() }}>
                    {dateParts().dateDisplay}
                </div>
            ) : null}
            <div class="clock" classList={{ 'clock--entered': hasEntered() }}>
                {formatTimeString(now(), props.config.format)}
            </div>
        </div>
    );
}
