import { clear, h } from './dom';
import { S } from './strings.es';
import type { Store } from './store';
import type { Settings, UiActions, UiState } from './uiState';

const SPEEDS: Settings['botSpeed'][] = ['normal', 'fast', 'instant'];

export function mountSettingsPanel(
  root: HTMLElement,
  store: Store<UiState>,
  actions: UiActions,
): () => void {
  const el = h('div', { class: 'settings-wrap' });
  root.append(el);
  let open = false;

  const render = (): void => {
    clear(el);
    const s = store.get();
    el.append(
      h(
        'button',
        {
          testid: 'settings-open',
          class: 'settings-open',
          title: S.settings.title,
          onclick: () => {
            open = !open;
            render();
          },
        },
        '⚙',
      ),
    );
    if (!open) return;
    el.append(
      h(
        'div',
        { testid: 'settings', class: 'settings' },
        h('h2', {}, S.settings.title),
        h(
          'label',
          { class: 'field' },
          `${S.settings.volume}: `,
          h('input', {
            testid: 'settings-volume',
            type: 'range',
            min: '0',
            max: '1',
            step: '0.05',
            value: String(s.settings.volume),
            oninput: (ev: Event) =>
              actions.updateSettings({ volume: Number((ev.target as HTMLInputElement).value) }),
          }),
        ),
        h(
          'label',
          { class: 'field' },
          `${S.settings.mute}: `,
          h('input', {
            testid: 'settings-mute',
            type: 'checkbox',
            checked: s.settings.muted,
            onchange: (ev: Event) =>
              actions.updateSettings({ muted: (ev.target as HTMLInputElement).checked }),
          }),
        ),
        h(
          'label',
          { class: 'field' },
          `${S.settings.reduceMotion}: `,
          h('input', {
            testid: 'settings-motion',
            type: 'checkbox',
            checked: s.settings.reduceMotion,
            onchange: (ev: Event) =>
              actions.updateSettings({ reduceMotion: (ev.target as HTMLInputElement).checked }),
          }),
        ),
        h(
          'label',
          { class: 'field' },
          `${S.settings.botSpeed}: `,
          h(
            'select',
            {
              testid: 'settings-botspeed',
              onchange: (ev: Event) =>
                actions.updateSettings({
                  botSpeed: (ev.target as HTMLSelectElement).value as Settings['botSpeed'],
                }),
            },
            ...SPEEDS.map((sp) =>
              h(
                'option',
                { value: sp, selected: s.settings.botSpeed === sp },
                S.settings.speed[sp],
              ),
            ),
          ),
        ),
        h(
          'button',
          {
            testid: 'settings-close',
            class: 'primary',
            onclick: () => {
              open = false;
              render();
            },
          },
          S.settings.close,
        ),
      ),
    );
  };

  const unsub = store.subscribe(() => render());
  return () => {
    unsub();
    el.remove();
  };
}
