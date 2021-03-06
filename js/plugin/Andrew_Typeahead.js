/*
Modification Date: 2018-05-12
Coding by Andrew.Kim (E-mail: andrewkim365@qq.com)
*/
/*-----------------------------------------------Andrew_Typeahead-----------------------------------------*/
(function($) {
    var Andrew_Typeahead = function(element, options) {
        var Typeahead = this;
        setTimeout(function() {
                Typeahead.$element = $(element);
                Typeahead.options = $.extend(true, {},
                    $.fn.Andrew_Typeahead.defaults, options);
                Typeahead.$menu = $(Typeahead.options.menu).appendTo("body");
                Typeahead.shown = false;
                Typeahead.eventSupported = Typeahead.options.eventSupported || Typeahead.eventSupported;
                Typeahead.grepper = Typeahead.options.grepper || Typeahead.grepper;
                Typeahead.highlighter = Typeahead.options.highlighter || Typeahead.highlighter;
                Typeahead.lookup = Typeahead.options.lookup || Typeahead.lookup;
                Typeahead.matcher = Typeahead.options.matcher || Typeahead.matcher;
                Typeahead.render = Typeahead.options.render || Typeahead.render;
                Typeahead.init = Typeahead.options.init || Typeahead.init;
                Typeahead.ele_show = Typeahead.options.ele_show || Typeahead.ele_show;
                Typeahead.select = Typeahead.options.select || Typeahead.select;
                Typeahead.sorter = Typeahead.options.sorter || Typeahead.sorter;
                Typeahead.source = Typeahead.options.source || Typeahead.source;
                if (!Typeahead.source.length) {
                    var ajax = Typeahead.options.ajax;
                    if (typeof ajax === "string") {
                        Typeahead.ajax = $.extend({},
                            $.fn.Andrew_Typeahead.defaults.ajax, {
                                url: ajax
                            })
                    } else {
                        Typeahead.ajax = $.extend({},
                            $.fn.Andrew_Typeahead.defaults.ajax, ajax)
                    }
                    if (!Typeahead.ajax.url) {
                        Typeahead.ajax = null
                    }
                }
                Typeahead.init();
                Typeahead.listen()
            },
            100)
    };
    Andrew_Typeahead.prototype = {
        constructor: Andrew_Typeahead,
        init: function() {
            var that = this;
            that.$element.bind("focus",
                function() {
                    that.ele_show(1);
                    that.$menu.children("ul").hide()
                });
            that.$element.bind("input propertychange",
                function() {
                    that.ele_show(1);
                    if (that.$menu.children("ul").find("li").length > 0) {
                        that.$menu.children("ul").show()
                    } else {
                        that.$menu.children("ul").hide()
                    }
                    if (that.$element.val().length == 0) {
                        that.$menu.children("ul").empty();
                        that.$element.blur()
                    }
                })
        },
        ele_show: function(flag) {
            var that = this;
            if (flag) {
                that.$menu.on("touchmove",
                    function(event) {
                        event.preventDefault()
                    })
            } else {
                that.$menu.unbind("touchmove")
            }
            that.$menu.css({
                "top": that.$element.parent().parent().outerHeight()-1,
                "left": "0",
                "width": "100%"
            });
            that.$menu.children("ul").addClass("scrolling").css({
                "overflow-y": "scroll",
                "height": $(window).height()
            });
            that.$element.parent().parent().addClass("ak-is_search w_100 zindex_show fix top_0 left_0");
            $("header").hide();
            $("main").addClass("mt_0").removeClass("scrolling");
            $(window).bind("hashchange",
                function() {
                    that.$menu.remove();
                    $("header").show();
                    $("main").removeClass("mt_0").addClass("scrolling")
                });
            that.$menu.fadeIn();
            that.options.showCallBack(that.$menu);
            that.shown = true
        },
        eventSupported: function(eventName) {
            var isSupported = (eventName in this.$element);
            if (!isSupported) {
                this.$element.setAttribute(eventName, "return;");
                isSupported = typeof this.$element[eventName] === "function"
            }
            return isSupported
        },
        ajaxer: function() {
            var that = this,
                query = that.$element.val();
            if (query === that.query) {
                return that
            }
            that.query = query;
            if (that.ajax.timerId) {
                clearTimeout(that.ajax.timerId);
                that.ajax.timerId = null
            }
            if (!query || query.length < that.ajax.triggerLength) {
                if (that.ajax.xhr) {
                    that.ajax.xhr.abort();
                    that.ajax.xhr = null;
                    that.ajaxToggleLoadClass(false)
                }
                return that.shown ? that.hide() : that
            }
            that.ajax.timerId = setTimeout(function() {
                    $.proxy(that.ajaxExecute(query), that)
                },
                that.ajax.timeout);
            return that
        },
        ajaxExecute: function(query) {
            this.ajaxToggleLoadClass(true);
            if (this.ajax.xhr) {
                this.ajax.xhr.abort()
            }
            var params = this.ajax.preDispatch ? this.ajax.preDispatch(query) : {
                query: query
            };
            var jAjax = (this.ajax.method === "post") ? $.post: $.get;
            this.ajax.xhr = jAjax(this.ajax.url, params, $.proxy(this.ajaxLookup, this));
            this.ajax.timerId = null
        },
        ajaxLookup: function(data) {
            var items;
            this.ajaxToggleLoadClass(false);
            if (!this.ajax.xhr) {
                return
            }
            if (this.ajax.preProcess) {
                data = this.ajax.preProcess(data)
            }
            this.ajax.data = data;
            items = this.grepper(this.ajax.data);
            if (!items || !items.length) {
                return this.shown ? this.hide() : this
            }
            this.ajax.xhr = null;
            return this.render(items.slice(0, this.options.items)).show()
        },
        ajaxToggleLoadClass: function(enable) {
            if (!this.ajax.loadingClass) {
                return
            }
            this.$element.toggleClass(this.ajax.loadingClass, enable)
        },
        lookup: function(event) {
            var that = this,
                items;
            if (that.ajax) {
                that.ajaxer()
            } else {
                that.query = that.$element.val();
                if (!that.query) {
                    return that.shown ? that.hide() : that
                }
                items = that.grepper(that.source);
                if (!items || !items.length) {
                    return that.shown ? that.show() : that
                }
                return that.render(items.slice(0, that.options.items)).show()
            }
        },
        grepper: function(data) {
            var that = this,
                items;
            if (data && data.length && !data[0].hasOwnProperty(that.options.display)) {
                return null
            }
            items = $.grep(data,
                function(item) {
                    return that.matcher(item[that.options.display], item)
                });
            return this.sorter(items)
        },
        matcher: function(item) {
            return~item.toLowerCase().indexOf(this.query.toLowerCase())
        },
        sorter: function(items) {
            var that = this,
                beginswith = [],
                caseSensitive = [],
                caseInsensitive = [],
                item;
            while (item = items.shift()) {
                if (!item[that.options.display].toLowerCase().indexOf(this.query.toLowerCase())) {
                    beginswith.push(item)
                } else {
                    if (~item[that.options.display].indexOf(this.query)) {
                        caseSensitive.push(item)
                    } else {
                        caseInsensitive.push(item)
                    }
                }
            }
            return beginswith.concat(caseSensitive, caseInsensitive)
        },
        show: function() {
            var that = this;
            that.ele_show();
            this.$menu.bind("touchstart",
                function() {
                    document.activeElement.blur()
                });
            return this
        },
        hide: function() {
            this.$element.parent().parent().removeClass("ak-is_search w_100 zindex_show fix top_0 left_0");
            $("header").show();
            $("main").removeClass("mt_0").addClass("scrolling");
            this.$menu.hide();
            this.shown = false;
            return this
        },
        highlighter: function(item) {
            var query = this.query.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
            return item.replace(new RegExp("(" + query + ")", "ig"),
                function($1, match) {
                    return "<strong>" + match + "</strong>"
                })
        },
        render: function(items) {
            var that = this;
            this.$menu.html("<ul />");
            items = $(items).map(function(i, item) {
                i = $(that.options.item).attr("data-value", item[that.options.val]);
                i.html(that.highlighter(item[that.options.display], item));
                return i[0]
            });
            items.first().addClass("ak-is_active");
            this.$menu.children("ul").html(items);
            return this
        },
        select: function() {
            var that = this;
            var $selectedItem = this.$menu.find(".ak-is_active");
            setTimeout(function() {
                    document.activeElement.blur();
                    that.hide();
                    that.$element.val($selectedItem.text()).change()
                },
                150);
            if (this.$element.val != "") {
                this.$menu.find("li").on("click",
                    function(e) {
                        e.stopPropagation();
                        that.hide()
                    })
            }
            this.$menu.children("ul").empty();
            this.options.itemSelected($selectedItem, $selectedItem.attr("data-value"), $selectedItem.text());
            return
        },
        next: function(event) {
            var active = this.$menu.find(".ak-is_active").removeClass("ak-is_active");
            var next = active.next();
            if (!next.length) {
                next = $(this.$menu.find("li")[0])
            }
            next.addClass("ak-is_active")
        },
        prev: function(event) {
            var active = this.$menu.find(".ak-is_active").removeClass("ak-is_active");
            var prev = active.prev();
            if (!prev.length) {
                prev = this.$menu.find("li").last()
            }
            prev.addClass("ak-is_active")
        },
        listen: function() {
            this.$element.on("blur", $.proxy(this.blur, this)).on("input propertychange", $.proxy(this.keyup, this));
            if (this.eventSupported("keydown")) {
                this.$element.on("keydown", $.proxy(this.keypress, this))
            } else {
                this.$element.on("keypress", $.proxy(this.keypress, this))
            }
            this.$menu.on("click", $.proxy(this.click, this)).on("mouseenter", "li", $.proxy(this.mouseenter, this))
        },
        keyup: function(e) {
            e.stopPropagation();
            e.preventDefault();
            switch (e.keyCode) {
                case 40:
                case 38:
                    break;
                case 9:
                case 13:
                    if (!this.shown) {
                        return
                    }
                    this.select();
                    break;
                case 27:
                    this.hide();
                    break;
                default:
                    this.lookup()
            }
        },
        keypress: function(e) {
            e.stopPropagation();
            if (!this.shown) {
                return
            }
            switch (e.keyCode) {
                case 9:
                case 13:
                case 27:
                    e.preventDefault();
                    break;
                case 38:
                    e.preventDefault();
                    this.prev();
                    break;
                case 40:
                    e.preventDefault();
                    this.next();
                    break
            }
        },
        blur: function(e) {
            var that = this;
            e.stopPropagation();
            e.preventDefault();
            if (that.$element.val().length == 0) {
                that.hide()
            }
            setTimeout(function() {
                    document.activeElement.blur()
                },
                150)
        },
        click: function(e) {
            e.stopPropagation();
            e.preventDefault();
            this.select()
        },
        mouseenter: function(e) {
            this.$menu.find(".ak-is_active").removeClass("ak-is_active");
            $(e.currentTarget).addClass("ak-is_active")
        }
    };
    $.fn.Andrew_Typeahead = function(option) {
        return this.each(function() {
            var $this = $(this),
                data = $this.data("ak_typeahead"),
                options = typeof option === "object" && option;
            if (!data) {
                $this.data("ak_typeahead", (data = new Andrew_Typeahead(this, options)))
            }
            if (typeof option === "string") {
                data[option]()
            }
        })
    };
    $.fn.Andrew_Typeahead.defaults = {
        source: [],
        items: 20,
        menu: '<div class="ak-typeahead"></div>',
        item: '<li class="touchstart"></li>',
        display: "name",
        val: "id",
        showCallBack: function() {},
        itemSelected: function() {},
        ajax: {
            url: null,
            timeout: 300,
            method: "post",
            triggerLength: 3,
            loadingClass: null,
            displayField: null,
            preDispatch: null,
            preProcess: null
        }
    };
    $.fn.Andrew_Typeahead.Constructor = Andrew_Typeahead;
    $(function() {
        $("body").on("focus.ak_typeahead.data-api", '[data-provide="ak_typeahead"]',
            function(e) {
                var $this = $(this);
                if ($this.data("ak_typeahead")) {
                    return
                }
                e.preventDefault();
                $this.ak_typeahead($this.data())
            })
    })
} (jQuery));
