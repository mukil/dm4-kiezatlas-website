
// requires a certain dom structure and an instance of ka-website.js as "kiezatlas"
function do_citymap_fulltext_search(query) {
    kiezatlas.do_text_search_geo_objects(query.trim(), function(geoobjects) {
        $('.citymap .ui.search button .icon').removeClass("loading").removeClass("circle").removeClass('notched')
        $('.citymap .ui.search button .icon').addClass("search")
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
            var $item = $('<li class="item" id="'+obj.id+'"><h3>' + obj.name
                + ', <span class="anschrift">'+obj.anschrift.replace(" Deutschland", "") +'</span>, '
                + '<a href="/website/geo/'+obj.id+'">mehr Infos</a></h3></li>')
                $item.click(function(e) {
                    console.log("Clicked on Result list item focus in map..", e.target.id, e)
                })
            $ul.append($item)
        }
    })
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
                doSelectCriteria(e.target.text, e.target.id)
            })
        $list.append($item.append($link))
    }
}

function doSelectCriteria(critName, criteriaTypeUri) {
    if ($('.tabular.menu #category-tab').length === 0) {
        $('.tabular.menu').append('<div id="category-tab" class="item" data-tab="fourth">Kategorien</div>')
    } else {
        // $('#category-tab').text(critName)
    }
    $('.tabular.menu .item').tab('change tab', 'fourth')
    var $ul = $('#category-area ul.results')
        $ul.empty()
    restc.load_topics_by_type(criteriaTypeUri, function(categories) {
        console.log("Loaded Categories", categories)
        // render list of results in orte section
        for (var c in categories) {
            var cat = categories[c]
            var $listitem = $("<li id=\"" + cat.id + "\"><span class=\"label\">" + cat.value + "</span></li>")
                $listitem.click(function(e) {
                    console.log("Selected Category", e.target.text, e.target.id)
                    doSelectCategory(e.target.text, e.target.id)
                })
            $ul.append($listitem)
        }
        // ...
    })
}

function doSelectCategory(catName, categoryId) {
    restc.load_geo_objects_by_category(categoryId, function(e) {
        console.log("Loaded Geo Objects by Category", categoryId)
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
