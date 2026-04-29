export function LoadingOverlay(props: { hidden: boolean; text: string; percent: number }) {
    return (
        <div classList={{ 'loading-overlay': true, hidden: props.hidden }}>
            <div class="loading-panel">
                <div class="loading-spinner"></div>
                <div class="loading-text">{props.text}</div>
                <div class="loading-progress">
                    <div class="loading-bar" style={{ width: `${props.percent}%` }}></div>
                </div>
                <div class="loading-percent">{props.percent}%</div>
            </div>
        </div>
    );
}
