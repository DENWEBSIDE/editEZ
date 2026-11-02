import { useStore } from '../../store';
import { useT } from '../../i18n';
import { Kbd, Modal } from '../ui';
import { modKey } from '../../lib/format';

export function ShortcutsDialog() {
  const t = useT();
  const openDialog = useStore((s) => s.openDialog);
  const mod = modKey();

  const groups: { title: string; items: [string, string[]][] }[] = [
    {
      title: t('shortcuts.group.transport'),
      items: [
        [t('shortcuts.play'), ['Space']],
        [t('shortcuts.frameBack'), ['←']],
        [t('shortcuts.frameFwd'), ['→']],
        [t('shortcuts.jump10'), ['Shift', '← / →']],
        [t('shortcuts.start'), ['Home']],
        [t('shortcuts.end'), ['End']],
      ],
    },
    {
      title: t('shortcuts.group.edit'),
      items: [
        [t('shortcuts.split'), ['S']],
        [t('shortcuts.delete'), ['Delete']],
        [t('shortcuts.rippleDelete'), ['Shift', 'Delete']],
        [t('shortcuts.duplicate'), [mod, 'D']],
        [t('shortcuts.copy'), [mod, 'C']],
        [t('shortcuts.paste'), [mod, 'V']],
        [t('shortcuts.group.shortcut'), ['G']],
        [t('shortcuts.undo'), [mod, 'Z']],
        [t('shortcuts.redo'), [mod, 'Shift', 'Z']],
        [t('shortcuts.marker'), ['M']],
      ],
    },
    {
      title: t('shortcuts.group.timeline'),
      items: [
        [t('shortcuts.select'), ['V']],
        [t('shortcuts.razor'), ['C']],
        [t('shortcuts.snap'), ['N']],
        [t('shortcuts.zoomIn'), ['+']],
        [t('shortcuts.zoomOut'), ['−']],
        [t('shortcuts.fit'), ['F']],
      ],
    },
    {
      title: t('shortcuts.group.project'),
      items: [
        [t('shortcuts.save'), [mod, 'S']],
        [t('shortcuts.export'), [mod, 'E']],
        [t('shortcuts.help'), ['?']],
      ],
    },
  ];

  return (
    <Modal title={t('shortcuts.title')} onClose={() => openDialog(null)} size="lg">
      <div className="shortcuts-grid">
        {groups.map((group) => (
          <section key={group.title} className="shortcut-group">
            <h3>{group.title}</h3>
            <ul>
              {group.items.map(([label, keys]) => (
                <li key={label}>
                  <span>{label}</span>
                  <span className="shortcut-keys">
                    {keys.map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="modal-hint">{t('shortcuts.pressEsc')}</p>
    </Modal>
  );
}
