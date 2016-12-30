
var DATA_TOPIC_ID = "data-topic-id"

// requires a certain dom structure and an instance of ka-website.js as "kiezatlas"
function do_citymap_fulltext_search(query) {
    kiezatlas.do_text_search_geo_objects(query.trim(), function(geoobjects) {
        hide_loading_indicator()
        // switch to results tab
        if ($('.tabular.menu #search-tab').length === 0) {
            $('.tabular.menu').append('<div id="search-tab" class="item" data-tab="third">Suche</div>')
        }
        $('.tabular.menu .item').tab('change tab', 'third')
        // render list of results in orte section
        var $ul = $('#search-area ul.results')
        // sorted?
        for (var geoidx in geoobjects) {
            var obj = geoobjects[geoidx]
            var $item = create_list_item(obj)
            $item.click(function(e) {
                var itemId = e.target.getAttribute(DATA_TOPIC_ID)
                if (!itemId) itemId = e.target.parentNode.getAttribute(DATA_TOPIC_ID)
                console.log("Clicked on search result item..", itemId)
            })
            $ul.append($item)
        }
    })
    show_loading_indicator()
}

function create_list_item(obj) {
    return $('<li class="item" data-topic-id="'+obj.id+'"><h3>' + obj.name
        + ', <span class="anschrift">'+obj.anschrift.replace(" Deutschland", "") +'</span>, '
        + '<a href="/website/geo/'+obj.id+'">mehr Infos</a></h3></li>')
}
function hide_loading_indicator() {
    $('.citymap .ui.search button .icon').removeClass("loading").removeClass("circle").removeClass('notched')
    $('.citymap .ui.search button .icon').addClass("search")
}

function show_loading_indicator() {
    $('.citymap .ui.search button .icon').addClass("loading").addClass("circle").addClass('notched')
    $('.citymap .ui.search button .icon').removeClass("search")
}

function render_criteria_menu(criterias) {
    var $div = $('.criterias')
        $div.empty()
    var $list = $('<ul class="items">')
        $div.append($list)
    for (var i in criterias) {
        var crit = criterias[i]
        var $item = $('<li>')
        var $link = $('<a id="'+crit.uri+'" href="#crit-' + crit.id + '">' + crit.value + '</a>')
            $link.click(function(e) {
                console.log("Selected Criteria", e.target.text, e.target.id)
                do_select_criteria(e.target.text, e.target.id)
            })
        $list.append($item.append($link))
    }
}

function do_select_criteria(critName, criteriaId) {
    if ($('.tabular.menu #category-tab').length === 0) {
        $('.tabular.menu').append('<div id="category-tab" class="item" data-tab="fourth">Kategorien</div>')
    }
    $('#category-area .title.criteria').text(critName)
    $('#category-area .title.criteria').attr(DATA_TOPIC_ID, criteriaId)
    $('#category-area .title.criteria').unbind("click")
    $('#category-area .title.criteria').bind("click", function(e) {
        do_select_criteria(critName, criteriaId)
    })
    $('.tabular.menu .item').tab('change tab', 'fourth')
    var $ul = $('#category-area ul.results')
        $ul.empty()
    restc.load_topics_by_type(criteriaId, function(categories) {
        console.log("Loaded Categories", categories)
        // render list of results in orte section
        for (var c in categories) {
            var cat = categories[c]
            var $listitem = $("<li id=\"" + cat.id + "\" data-topic-id=\"" + cat.id + "\">"
                    + "<span class=\"label\" data-topic-id=\"" + cat.id + "\">" + cat.value + "</span></li>")
                $listitem.click(function(e) {
                    var categoryId = e.target.getAttribute(DATA_TOPIC_ID)
                    do_select_category(categoryId)
                })
            $ul.append($listitem)
        }
        // ...
    })
}

function do_select_category(categoryId) {
    restc.load_geo_objects_by_category(kiezatlas.getSiteId(), categoryId, function(results) {
        console.log("Loaded Geo Objects by Category", categoryId, results)
        var $ul = $('#category-area ul.results')
        if (results.length > 0) {
            $ul.empty()
            for (var r in results) {
                var geoobject = results[r]
                var $item = create_list_item(geoobject)
                $item.click(function(e) {
                    var itemId = e.target.getAttribute(DATA_TOPIC_ID)
                    if (!itemId) itemId = e.target.parentNode.getAttribute(DATA_TOPIC_ID)
                    console.log("Clicked on category list item..", itemId)
                })
                $ul.append($item)
            }
        } else {
            $("#" + categoryId).append("<span class=\"status\">(Keine Treffer)</span>")
        }
    })
}

// requires a certain dom structure and an instance of ka-map.js as "leafletMap"
function register_page_handlers() {
    
    $(window).resize(function() {
        setTimeout(function() {
            leafletMap.fit_to_height(65)
            set_sidebar_height()
        }, 50)
    })

    // add click and touch handlers on our "three near by options"
    // kiezatlas.add_nearby_button_handler()

    $('.citymap .ui.search input').keyup(function(e) {
        if (e.target.value.length >= 3 && e.keyCode === 13) {
            do_citymap_fulltext_search(e.target.value)
        }
    })

    $('.citymap .ui.search button').click(function(e) {
        var query = $('.citymap .ui.search input').val()
        if (query.length >= 3) {
            do_citymap_fulltext_search(query)
        }
    })

    leafletMap.listen_to('marker_select', function(e) {
        $('.tabular.menu .item').tab('change tab', 'first')
    })

}

function set_sidebar_height() {
    if ($('#karte').css("display") === "none") {
        $('#sidebar').height(window.innerHeight - 4)
    } else {
        $('#sidebar').height(window.innerHeight - 36)
    }
}
