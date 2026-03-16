//*****************************************************************************************************//
//**********************************  LIGHTWEIGHT UI COMPONENTS  *************************************//
//**********************************  (Materialize replacement)  *************************************//
//*****************************************************************************************************//

/* ── Shared overlay (one for all modals) ── */
const _overlay = document.createElement('div');
_overlay.className = 'modal-overlay';
document.body.appendChild(_overlay);

/* ── Modal ── */
const Modal = (() => {
    const instances = new Map();

    class ModalInstance {
        constructor(el, opts = {}) {
            this.el = el;
            this.opts = opts;
            instances.set(el, this);

            // close on overlay click
            _overlay.addEventListener('click', () => {
                // close whichever modal is open
                instances.forEach(inst => { if (inst.el.classList.contains('open')) inst.close(); });
            });

            // close on Escape
            this._onKey = (e) => { if (e.key === 'Escape' && this.el.classList.contains('open')) this.close(); };
            document.addEventListener('keydown', this._onKey);
        }

        open() {
            if (this.opts.onOpenStart) this.opts.onOpenStart();
            _overlay.classList.add('active');
            this.el.classList.add('open');
            if (this.opts.onOpenEnd) this.opts.onOpenEnd();
        }

        close() {
            this.el.classList.remove('open');
            _overlay.classList.remove('active');
            if (this.opts.onCloseEnd) this.opts.onCloseEnd();
        }
    }

    return {
        init(el, opts) {
            if (el instanceof NodeList || Array.isArray(el)) {
                el.forEach(e => new ModalInstance(e, opts));
            } else {
                new ModalInstance(el, opts);
            }
        },
        getInstance(el) { return instances.get(el); }
    };
})();

/* ── FormSelect (no-op: use browser-default selects) ── */
const FormSelect = {
    init(/* el */) { /* native selects — nothing to do */ }
};

/* ── Toast ── */
const Toast = (() => {
    let container = null;

    function ensure() {
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
    }

    return {
        show({ html = '', classes = '', displayLength = 4000 } = {}) {
            ensure();
            const t = document.createElement('div');
            t.className = 'toast ' + classes;
            t.innerHTML = html;
            container.appendChild(t);
            setTimeout(() => { t.remove(); }, displayLength);
        }
    };
})();

/* ── Expose as window.M so existing call-sites keep working ── */
window.M = window.M || {};
window.M.Modal      = Modal;
window.M.FormSelect = FormSelect;
window.M.toast      = function(opts) { Toast.show(opts); };
window.M.keys       = { TAB: 9, ENTER: 13, ESC: 27, ARROW_UP: 38, ARROW_DOWN: 40 };
