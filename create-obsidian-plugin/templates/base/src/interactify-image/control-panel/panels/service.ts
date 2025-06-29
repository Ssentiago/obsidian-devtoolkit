import { Platform } from 'obsidian';

import { t } from '../../../lang';
import en from '../../../lang/locale/en/nested';
import { PanelsTriggering } from '../../../settings/types/interfaces';
import { TriggerType } from '../../types/constants';
import { updateButton } from '../helpers/helpers';
import { IControlPanel } from '../types/interfaces';
import { BasePanel } from './base-panel';
import { ServiceButtons } from './types/constants';
import { ButtonsData } from './types/interfaces';

export class ServicePanel extends BasePanel<ServiceButtons> {
    buttons = new Map<ServiceButtons, ButtonsData>();

    constructor(controlPanel: IControlPanel) {
        super(controlPanel);
    }

    initialize(): void {
        super.initialize();
        this.setupEventListeners();
    }

    get enabled(): boolean {
        return (
            this.unit.plugin.settings.data.panels.local.panels.service.on &&
            this.unit.context.options.panels.service.on
        );
    }

    get cssClass() {
        return 'interactify-service-panel';
    }

    get cssStyles() {
        return {
            ...this.unit.plugin.settings.data.panels.local.panels.service
                .position,
            gridTemplateColumns: 'repeat(auto-fit, minmax(24px, 1fr))',
            gridAutoFlow: 'column',
        };
    }

    getButtonsConfig() {
        const buttons = [];

        const container = this.unit.context.container;

        const serviceButtons =
            this.unit.plugin.settings.data.panels.local.panels.service.buttons;

        const getHideTitle = (state: 'hidden' | 'shown') =>
            state === 'hidden'
                ? t.image.controlPanel.service.hide.hidden
                : t.image.controlPanel.service.hide.shown;

        if (serviceButtons.hide) {
            buttons.push({
                id: ServiceButtons.Hide,
                icon: 'eye',
                action: (): void => {
                    const button = this.buttons.get(
                        ServiceButtons.Hide
                    )?.element;

                    if (!button) {
                        return;
                    }
                    const isCurrentlyHiding = button.dataset.hiding === 'true';

                    const willBeHiding = !isCurrentlyHiding;

                    button.dataset.hiding = willBeHiding.toString();

                    isCurrentlyHiding
                        ? this.controlPanel.show(TriggerType.SERVICE_HIDING)
                        : this.controlPanel.hide(TriggerType.SERVICE_HIDING);

                    updateButton(
                        button,
                        isCurrentlyHiding ? 'eye' : 'eye-off',
                        getHideTitle(willBeHiding ? 'hidden' : 'shown')
                    );
                },
                title: getHideTitle('shown'),
                dataAttributes: {
                    hiding: 'false',
                },
            });
        }

        const getFullscreenTitle = (state: 'on' | 'off') =>
            state === 'on'
                ? t.image.controlPanel.service.fullscreen.on
                : t.image.controlPanel.service.fullscreen.off;

        if (serviceButtons.fullscreen) {
            buttons.push({
                id: ServiceButtons.Fullscreen,
                icon: 'maximize',
                action: async (): Promise<void> => {
                    const button = this.buttons.get(
                        ServiceButtons.Fullscreen
                    )?.element;

                    if (!button) {
                        return;
                    }

                    if (!document.fullscreenElement) {
                        container.addClass('is-fullscreen');
                        await container.requestFullscreen({
                            navigationUI: 'auto',
                        });
                        updateButton(
                            button,
                            'minimize',
                            getFullscreenTitle('off')
                        );
                    } else {
                        container.removeClass('is-fullscreen');
                        await document.exitFullscreen();
                        updateButton(
                            button,
                            'maximize',
                            getFullscreenTitle('on')
                        );
                    }
                },
                title: getFullscreenTitle('off'),
            });
        }

        const getTouchTitle = (enabled: boolean) =>
            enabled
                ? t.image.controlPanel.service.touch.on
                : t.image.controlPanel.service.touch.off;

        if (Platform.isMobileApp) {
            buttons.push({
                id: ServiceButtons.Touch,
                icon: this.unit.nativeTouchEventsEnabled
                    ? 'circle-slash-2'
                    : 'hand',
                action: (): void => {
                    const btn = this.buttons.get(ServiceButtons.Touch)?.element;

                    if (!btn) {
                        return;
                    }

                    this.unit.nativeTouchEventsEnabled =
                        !this.unit.nativeTouchEventsEnabled;

                    const actualNativeTouchEventsEnabled =
                        this.unit.nativeTouchEventsEnabled;

                    updateButton(
                        btn,
                        this.unit.nativeTouchEventsEnabled
                            ? 'circle-slash-2'
                            : 'hand',
                        getTouchTitle(actualNativeTouchEventsEnabled)
                    );

                    this.unit.plugin.showNotice(
                        `Native touches are ${actualNativeTouchEventsEnabled ? 'enabled' : 'disabled'} now. 
            You ${actualNativeTouchEventsEnabled ? 'cannot' : 'can'} move and pinch zoom image.`
                    );
                },
                title: getTouchTitle(this.unit.nativeTouchEventsEnabled),
            });
        }

        return buttons;
    }

    setupPanelContents() {
        const settings = this.unit.plugin.settings;
        this.panel.toggleClass(
            'hidden',
            settings.data.panels.global.triggering.mode !==
                PanelsTriggering.ALWAYS &&
                !settings.data.panels.global.triggering.ignoreService
        );
        super.setupPanelContents();
    }

    setupEventListeners(): void {
        const fullscreenButton = this.buttons.get(
            ServiceButtons.Fullscreen
        )?.element;

        if (!fullscreenButton) {
            return;
        }

        this.registerDomEvent(
            this.unit.context.container,
            'fullscreenchange',
            this.onFullScreenChange
        );
    }

    private readonly onFullScreenChange = (): void => {
        const button = this.buttons.get(ServiceButtons.Fullscreen)?.element;

        if (!button) {
            return;
        }
        if (document.fullscreenElement) {
            requestAnimationFrame(() => {
                this.unit.actions.resetZoomAndMove();
            });
            updateButton(
                button,
                'minimize',
                t.image.controlPanel.service.fullscreen.on
            );
        } else {
            requestAnimationFrame(() => {
                this.unit.actions.resetZoomAndMove();
            });
            updateButton(
                button,
                'maximize',
                t.image.controlPanel.service.fullscreen.off
            );
        }
    };

    protected get supportedTriggers(): number {
        const base = super.supportedTriggers & ~TriggerType.SERVICE_HIDING;
        const shouldIgnoreExternalTriggers =
            this.unit.plugin.settings.data.panels.global.triggering
                .ignoreService;

        if (!shouldIgnoreExternalTriggers) {
            return base;
        }

        const unSupportedFlags = TriggerType.MOUSE | TriggerType.FOCUS;
        return base & ~unSupportedFlags;
    }
}
