<script lang="ts">
    import { onMount } from 'svelte';
    import Icon from './Icon.svelte';
    import type { SocialLink, SocialLinksConfig } from '../types/site';

    const cycleColors = ['#ffe600', '#ff3e3e', '#3e59ff'];
    const ITEMS_PER_PAGE = 6;

    let { config }: { config: SocialLinksConfig } = $props();

    let breathe = $state(true);
    let currentPage = $state(0);
    let transitionDirection = $state<'next' | 'prev' | null>(null);
    let animationKey = $state(0);
    let navRef: HTMLElement | undefined = $state();
    let suppressNextClick = false;
    let suppressClickTimer: ReturnType<typeof setTimeout> | undefined;

    let totalPages = $derived(Math.ceil(config.links.length / ITEMS_PER_PAGE));
    let pages = $derived.by(() => {
        const result: SocialLink[][] = [];
        for (let i = 0; i < config.links.length; i += ITEMS_PER_PAGE) {
            result.push(config.links.slice(i, i + ITEMS_PER_PAGE));
        }
        return result;
    });
    let currentLinks = $derived(pages[currentPage] ?? []);

    function showPage(target: number) {
        const clamped = Math.max(0, Math.min(target, totalPages - 1));
        if (clamped === currentPage) return;
        transitionDirection = target > currentPage ? 'next' : 'prev';
        currentPage = clamped;
        animationKey += 1;
        clearAllHoveredStates();
    }

    function setHoveredState(element: HTMLElement, hovered: boolean) {
        element.classList.toggle('is-hovered', hovered);
    }

    function clearAllHoveredStates() {
        if (!navRef) return;
        navRef.querySelectorAll('.social-link-slot.is-hovered').forEach((element) => {
            element.classList.remove('is-hovered');
        });
        const activeElement = document.activeElement;
        if (activeElement instanceof HTMLElement && navRef.contains(activeElement)) {
            activeElement.blur();
        }
    }

    function clearHoveredStateOnNavigate(linkElement: HTMLAnchorElement) {
        const slot = linkElement.closest('.social-link-slot');
        if (slot) setHoveredState(slot as HTMLElement, false);
        linkElement.blur();
    }

    function handleLinkClick(event: MouseEvent, linkElement: HTMLAnchorElement) {
        if (suppressNextClick) {
            event.preventDefault();
            event.stopPropagation();
            suppressNextClick = false;
            clearHoveredStateOnNavigate(linkElement);
            return;
        }
        clearHoveredStateOnNavigate(linkElement);
    }

    onMount(() => {
        const wrapper = navRef;
        if (!wrapper || totalPages <= 1) return;

        const breatheTimer = setTimeout(() => (breathe = false), 3200);
        window.addEventListener('pagehide', clearAllHoveredStates);
        window.addEventListener('pageshow', clearAllHoveredStates);

        let isDown = false;
        let startX = 0;
        let wheelLocked = false;
        let wheelSettlingTimer: ReturnType<typeof setTimeout> | undefined;

        function handlePointerDown(e: PointerEvent) {
            isDown = true;
            suppressNextClick = false;
            startX = e.pageX - wrapper.offsetLeft;
            wrapper.setPointerCapture(e.pointerId);
        }

        function handlePointerMove(e: PointerEvent) {
            if (!isDown) return;
            e.preventDefault();
        }

        function handlePointerUp(e: PointerEvent) {
            isDown = false;
            const dragX = e.pageX - wrapper.offsetLeft;
            const dragDistance = dragX - startX;
            if (Math.abs(dragDistance) < 36) return;
            suppressNextClick = true;
            clearTimeout(suppressClickTimer);
            suppressClickTimer = setTimeout(() => (suppressNextClick = false), 300);
            showPage(currentPage + (dragDistance < 0 ? 1 : -1));
        }

        function renewWheelLock() {
            clearTimeout(wheelSettlingTimer);
            wheelSettlingTimer = setTimeout(() => (wheelLocked = false), 450);
        }

        function handleWheel(e: WheelEvent) {
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
            const direction = Math.sign(e.deltaY);
            if (direction === 0) return;
            if (wheelLocked) {
                e.preventDefault();
                renewWheelLock();
                return;
            }
            const target = Math.max(0, Math.min(currentPage + direction, totalPages - 1));
            if (target === currentPage) return;
            e.preventDefault();
            wheelLocked = true;
            renewWheelLock();
            showPage(target);
        }

        wrapper.addEventListener('pointerdown', handlePointerDown);
        wrapper.addEventListener('pointermove', handlePointerMove);
        wrapper.addEventListener('pointerup', handlePointerUp);
        wrapper.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            clearTimeout(breatheTimer);
            clearTimeout(wheelSettlingTimer);
            clearTimeout(suppressClickTimer);
            window.removeEventListener('pagehide', clearAllHoveredStates);
            window.removeEventListener('pageshow', clearAllHoveredStates);
            wrapper.removeEventListener('pointerdown', handlePointerDown);
            wrapper.removeEventListener('pointermove', handlePointerMove);
            wrapper.removeEventListener('pointerup', handlePointerUp);
            wrapper.removeEventListener('wheel', handleWheel);
        };
    });
</script>

{#if config.links.length <= ITEMS_PER_PAGE}
    <nav bind:this={navRef} class="social-links" id="socialLinks" class:breathe-once={breathe}>
        {#each config.links as link, index}
            {@const color = link.color ?? (config.colorScheme === 'same' ? cycleColors[0] : cycleColors[index % 3])}
            {@const isMailTo = link.url.startsWith('mailto:')}
            <div
                class="social-link-slot"
                class:is-hovered={false}
                onpointerenter={(e) => setHoveredState(e.currentTarget, true)}
                onpointerleave={(e) => setHoveredState(e.currentTarget, false)}
                onpointerdown={(e) => setHoveredState(e.currentTarget, true)}
                onpointerup={(e) => setHoveredState(e.currentTarget, false)}
                onpointercancel={(e) => setHoveredState(e.currentTarget, false)}
            >
                <a
                    href={link.url}
                    aria-label={link.name}
                    target={isMailTo ? '_self' : '_blank'}
                    rel={isMailTo ? undefined : 'noopener noreferrer'}
                    class="social-link social-link--custom"
                    style="--custom-color: {color}"
                    onclick={(event) => handleLinkClick(event, event.currentTarget)}
                    onblur={(event) => {
                        const slot = event.currentTarget.closest('.social-link-slot');
                        if (slot) setHoveredState(slot as HTMLElement, false);
                    }}
                >
                    {#if link.icon}
                        <Icon name={link.icon} class="social-icon" size="1.25rem" />
                    {/if}
                    <span class="link-label">{link.name}</span>
                </a>
            </div>
        {/each}
    </nav>
{:else}
    <nav bind:this={navRef} class="social-links-wrapper" id="socialLinks" class:breathe-once={breathe}>
        <div
            id="socialLinksPage"
            class="social-links-page"
            data-page-key={animationKey}
            onanimationend={() => (transitionDirection = null)}
            class:is-swap-fade={transitionDirection !== null}
            class:is-animation-alt={animationKey % 2 === 1}
        >
            {#each currentLinks as link, index}
                {@const globalIdx = currentPage * ITEMS_PER_PAGE + index}
                {@const color =
                    link.color ?? (config.colorScheme === 'same' ? cycleColors[0] : cycleColors[globalIdx % 3])}
                {@const isMailTo = link.url.startsWith('mailto:')}
                <div
                    class="social-link-slot"
                    class:is-hovered={false}
                    onpointerenter={(e) => setHoveredState(e.currentTarget, true)}
                    onpointerleave={(e) => setHoveredState(e.currentTarget, false)}
                    onpointerdown={(e) => setHoveredState(e.currentTarget, true)}
                    onpointerup={(e) => setHoveredState(e.currentTarget, false)}
                    onpointercancel={(e) => setHoveredState(e.currentTarget, false)}
                >
                    <a
                        href={link.url}
                        aria-label={link.name}
                        target={isMailTo ? '_self' : '_blank'}
                        rel={isMailTo ? undefined : 'noopener noreferrer'}
                        class="social-link social-link--custom"
                        style="--custom-color: {color}"
                        onclick={(event) => handleLinkClick(event, event.currentTarget)}
                        onblur={(event) => {
                            const slot = event.currentTarget.closest('.social-link-slot');
                            if (slot) setHoveredState(slot as HTMLElement, false);
                        }}
                    >
                        {#if link.icon}
                            <Icon name={link.icon} class="social-icon" size="1.25rem" />
                        {/if}
                        <span class="link-label">{link.name}</span>
                    </a>
                </div>
            {/each}

            {#each Array.from({ length: ITEMS_PER_PAGE - currentLinks.length }) as _}
                <div class="social-link-slot social-link-slot--placeholder" aria-hidden="true"></div>
            {/each}
        </div>

        {#if totalPages > 1}
            <div class="social-links-dots">
                {#each Array.from({ length: totalPages }) as _, i}
                    <button
                        class="social-link-dot"
                        class:active={currentPage === i}
                        type="button"
                        aria-current={currentPage === i ? 'page' : undefined}
                        aria-controls="socialLinksPage"
                        onclick={() => showPage(i)}
                        aria-label={`social page ${i + 1}`}
                    ></button>
                {/each}
            </div>
        {/if}
    </nav>
{/if}
