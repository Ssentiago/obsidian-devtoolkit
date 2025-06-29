import InteractifyPlugin from '../../core/interactify-plugin';

export function createSettingsProxy(
    plugin: InteractifyPlugin,
    obj: any,
    path: any[] = []
) {
    return new Proxy(obj, {
        get(target, key) {
            const value = target[key];
            if (typeof value === 'object' && value !== null) {
                return createSettingsProxy(plugin, value, [...path, key]);
            }
            return value;
        },
        set(target, prop, value) {
            const oldValue = target[prop];
            target[prop] = value;
            const fullPath = [...path, prop].join('.');
            plugin.settings.eventBus?.emit(`settings.${fullPath}`, {
                eventName: `settings.${fullPath}`,
                oldValue,
                newValue: value,
            });

            return true;
        },

        deleteProperty(target, prop) {
            const oldValue = target[prop];
            const existed = prop in target;
            delete target[prop];

            if (existed) {
                const fullPath = [...path, prop].join('.');
                plugin.settings.eventBus?.emit(`settings.${fullPath}`, {
                    eventName: `settings.${fullPath}`,
                    operation: 'delete',
                    oldValue,
                    newValue: undefined,
                });
            }
            return true;
        },
    });
}
