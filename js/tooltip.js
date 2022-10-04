class TooltipManager {
    constructor(a) {
        this.config = { renameLinks: !0, iconizeLinks: !0, iconSize: "small", colorLinks: !0, ...a };
        (this.reqUrl = "https://api.wowclassicdb.com/tooltips"),
            (this.parseUrl = "classicdb.ch"),
            (this.validTypes = ["item", "npc", "quest", "spell", "item-set", "zone", "object", "faction"]),
            (this.iconUrl = "https://cdn.wowclassicdb.com/<ICON>.jpg"),
            (this.workers = 10),
            (this.storage = {}),
            (this.domStorage = {});
        for (const b of this.validTypes) (this.storage[b] = {}), (this.domStorage[b] = {});
        (this.tooltipDom = null), (this.breakpoint = 768), (this.touchTooltipActive = !1);
    }
    async _init() {
        $(document).ready(async () => {
            console.log("WoWDB: Initializing tooltip script v3.0.0..."), await this._appendTooltipDom(), await this._processPageLinks();
        });
    }
    async _appendTooltipDom() {
        this.tooltipDom = $(".wowclassicdb-tooltip-container")[0] || $('<div class="wowclassicdb-tooltip-container"></div>').appendTo("body");
    }
    async _processPageLinks() {
        const a = performance.now(),
            b = [];
        for (const a of Object.values($(`a[href*="${this.parseUrl}"]`).toArray())) {
            const c = $(a).attr("href"),
                d = c
                    .slice(c.indexOf(this.parseUrl) + this.parseUrl.length)
                    .split("/")
                    .filter((a) => a && !["https:", "http:"].includes(a));
            if (2 > d.length) continue;
            const e = d[0];
            if (!this.validTypes.includes(e)) continue;
            const f = parseInt(d[1]);
            isNaN(f) || (this.domStorage[e][f] || (this.domStorage[e][f] = []), this.domStorage[e][f].push($(a)), b.push({ type: e, id: f, dom: $(a) }));
        }
        const c = async (a) => {
                for (const b of a)
                    try {
                        await this._fetchAndFormatLink(b.type, b.id, b.dom);
                    } catch (a) {
                        console.log(`WoWDB Error: ${JSON.stringify(a)}`);
                    }
            },
            d = Array(this.workers).fill(b.values()).map(c),
            e = "function" == typeof Promise.allSettled;
        await (e ? Promise.allSettled(d) : Promise.all(d));
        const f = performance.now();
        console.log(`WoWDB: Formatted ${b.length} links in ${(f - a) / 1e3} seconds.`);
    }
    async _fetchAndFormatLink(a, b, c) {
        const d = await this._fetchLink(a, b, "full");
        d && (await this._formatLink(c, d, a));
    }
    async _fetchLink(a, b, c) {
        const d = `${this.reqUrl}/${a}/${b}${"short" === c ? "?short=true" : ""}`;
        return (
            (this.storage[a][b] && ("short" !== this.storage[a][b].type || "full" !== c)) ||
                (this.storage[a][b] = {
                    type: c,
                    content: $.ajax({ url: d, type: "GET" }).catch((a) => {
                        400 <= a.status ? console.log(`WoWDB ${d}: Error on URL fetch.`) : "error" === a.statusText && console.log(`WoWDB ${d}: Unknown error on URL fetch. Maybe CORS issue or missing internet connection.`);
                    }),
                }),
            this.storage[a][b].content
        );
    }
    async _formatLink(a, b, c) {
        const d = this._getIndividualConfigValue(a, "renameLinks", "wowdb-rename-link"),
            e = this._getIndividualConfigValue(a, "colorLinks", "wowdb-color-link"),
            f = this._getIndividualConfigValue(a, "iconizeLinks", "wowdb-iconize-link"),
            g = this._getIndividualConfigValue(a, "iconSize", "wowdb-icon-size");
        if ((a.addClass("wowclassicdb-link"), d && a.text(b.name), e && (b.quality ? a.addClass(`q-${b.quality.toLowerCase()}`) : a.addClass("misc")), f && (b.icon || "quest" === c))) {
            const d = this._getIconUrl(b.icon || "classic_quest_icon", "quest" === c ? "misc/" : "icons/");
            a.find(".wowclassicdb-link-icon").length || a.prepend(`<img class="wowclassicdb-link-icon wowclassicdb-icon-size-${g}" src="${d}" alt="${b.name}">`);
        }
        a.click((b) => {
            this._isTouchDevice() &&
                !this.touchTooltipActive &&
                (b.preventDefault(),
                (this.touchTooltipActive = !0),
                $(document).click((b) => {
                    this.tooltipDom.is(b.target) || a.is(b.target) || (this.tooltipDom.hide(), (this.touchTooltipActive = !1));
                }));
        }),
            a.on({
                mousemove: async (a) => {
                    const d = await this._fetchLink(c, b.id, "full");
                    if (!d) return;
                    const e = b.icon ? `<img class="wowclassicdb-tooltip-icon" src="${this._getIconUrl(b.icon)}" alt="${b.name}" />` : "";
                    this.tooltipDom.html(`${e}<div class="wowclassicdb-tooltip">${d.tooltip}</div>`);
                    const f = (a) => (0 < a ? a : 0),
                        g = a.pageY - this.tooltipDom.height() - 15,
                        h = window.pageYOffset - g,
                        i = f(g + f(h)),
                        j = window.innerWidth < this.breakpoint ? 15 : a.pageX + 15;
                    this.tooltipDom.css({ left: j, top: i }), this.tooltipDom.show();
                },
                mouseleave: () => {
                    this.tooltipDom.hide();
                },
            });
    }
    _getIconUrl(a, b = "icons/") {
        return this.iconUrl.replace("<ICON>", `${b}${a}`);
    }
    _isTouchDevice() {
        if ("ontouchstart" in window || window.TouchEvent) return !0;
        if (window.DocumentTouch && document instanceof DocumentTouch) return !0;
        const a = ["", "-webkit-", "-moz-", "-o-", "-ms-"].map((a) => `(${a}touch-enabled)`);
        return window.matchMedia(a.join(",")).matches;
    }
    _getIndividualConfigValue(a, b, c) {
        const d = a.data(c);
        return void 0 === d ? this.config[b] : d;
    }
    async refreshLinks() {
        this.domStorage = {};
        for (const a of this.validTypes) this.domStorage[a] = {};
        await this._processPageLinks();
    }
}
if ("undefined" == typeof $dbTooltips) {
    var $dbTooltips = new TooltipManager("undefined" == typeof wowdbTooltipConfig ? {} : wowdbTooltipConfig);
    $dbTooltips._init();
}
