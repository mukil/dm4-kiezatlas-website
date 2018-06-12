
/** --- ka-citymap.js --- **/

var DATA_TOPIC_ID = "data-topic-id"

function create_list_item(obj) {
    if (obj != null) {
        return $('<li class="item" data-topic-id="'+obj.id+'"><h3>' + obj.name
            + ', <span class="anschrift">'+obj.anschrift.replace(" Deutschland", "") +'</span>, '
            + '<a href="javascript:citymap.show_selected_detail('+obj.id+', true);">mehr Infos</a></h3></li>')
    } else {
        console.log("Skipped creting null list item", obj)
    }
}

function hide_loading_indicator() {
    $('.citymap .ui.search button .icon').removeClass("loading").removeClass("circle").removeClass('notched')
    $('.citymap .ui.search button .icon').addClass("search")
}

function show_loading_indicator() {
    $('.citymap .ui.search button .icon').addClass("loading").addClass("circle").addClass('notched')
    $('.citymap .ui.search button .icon').removeClass("search")
}

var display_map = false

var facetTypeDefs = undefined

var citymap = {

    init: function(siteAlias, no_map) {
        display_map = (!no_map) ? true : false
        // clear topicmaps cookie as it may effect our client loading facets
        js.remove_cookie("dm4_topicmap_id")
        // creates leaflet map
        citymap.setup_map_area("map", true)
        // show loading indicator
        kiezatlas.show_spinning_wheel()
        // Adapt our default leaflet map handling options
        // leafletMap.zoom.setPosition("topleft")
        leafletMap.deactivate_circle_control()
        leafletMap.remove_circle_search_control()
        // Init our map container
        // ### Todo: introduce new site configuration options (marker radius/size) with migration
        if (siteAlias.indexOf("stadtteil") !== -1) {
            leafletMap.set_marker_radius(10)
            leafletMap.set_marker_selected_radius(15)
            leafletMap.set_marker_fixed_radius(true)
        }
        // Load Site Info
        karestc.load_website_info(siteAlias, function(siteTopic) {
            // console.log("Load Kiezatlas Website ", siteAlias, siteTopic)
            kiezatlas.set_site_id(siteTopic.id)
            kiezatlas.set_site_info(siteTopic)
            kiezatlas.update_document_title(siteTopic.value)
            citymap.render_criteria_menu(siteTopic.criterias)
            // check on markercluster
            if (siteTopic.markercluster) {
                console.log("Do Use Markercluster")
                kiezatlas.load_marker_cluster_scripts()
            }
            if (siteTopic.locationPrompt) {
                console.log("### Do Location Prompt")
            }
            if (siteTopic.locationSearch) {
                console.log("### Enable Location Search")
            }
            if (siteTopic.fahrinfoLink) {
                console.log("### Render Fahrinfo Link")
            }
            // Display Citymap Details
            citymap.render_info_area(siteTopic)
            kiezatlas.show_newsfeed_area(siteTopic.id, siteTopic.newsfeed)
            // Load Geo Objects in Website
            karestc.load_website_geoobjects(siteTopic.id, function(results) {
                // leafletMap.clear_marker()
                kiezatlas.hide_spinning_wheel()
                leafletMap.set_items(results)
                leafletMap.render_geo_objects(true)
            })
            //
            karestc.load_website_facets(siteTopic.id, function(facetTypes) {
                // console.log("Loaded Websites Facet Type Definitions", facetTypes)
                facetTypeDefs = facetTypes
            })
        })
    },

    setup_map_area: function(domId, mouseWheelZoom) {
        var $map = $('#map')
            $map.empty()
            $map.show()
        var $star_button = $('.top.menu a.star')
            $star_button.show()
            // $star_button.button()
            /** $star_button.hover(function (e) {
                $('button.star img').attr('src', '/de.kiezatlas.website/images/1441217865_black_5_favorite_star-white.png')
            }, function (e) {
                $('button.star img').attr('src', '/de.kiezatlas.website/images/1441217865_black_5_favorite_star.png')
            }) **/
        $('.search-option.d').css('display', 'inline-block')
        $('#detail-area').show("inline")
        $('div.legende').show()
        //
        leafletMap.setup(domId, mouseWheelZoom)
        // 
        leafletMap.listen_to('drag', function(e) {
            if (leafletMap.is_circle_control_fixed() && kiezatlas.is_map_query_control()) {
                leafletMap.set_current_location_coords(leafletMap.get_map_center())
                leafletMap.set_circle_control_radius(leafletMap.get_circle_control_radius())
                leafletMap.render_circle_search_control(false)
            }
        })
        leafletMap.listen_to('drag_end', function(e) {
            if (e.detail >= 8) {
                if (leafletMap.is_circle_query_active() && leafletMap.is_circle_control_fixed() && kiezatlas.is_map_query_control()) {
                    kiezatlas.do_circle_search(undefined, undefined)
                    kiezatlas.do_reverse_geocode()
                }
            }
        })
        leafletMap.listen_to('marker_select', function(e) {
            // Note: ka-citymap.js only exists because it (here) introduces specifics to load _facetted_ geo object details 
            citymap.clear_details_area()
            citymap.show_selected_details(e.detail)
        })
        leafletMap.listen_to('marker_mouseover', function(e) {
            var geo_objects_under_marker = leafletMap.find_all_geo_objects(e.detail.target.options['location_id'])
            kiezatlas.show_marker_name_info(geo_objects_under_marker)
        })
        leafletMap.listen_to('marker_mouseout', function(e) {
            kiezatlas.hide_marker_name_info()
        })
        leafletMap.listen_to('circle_control_edit', function(e) {
            // ### on small screens (here, after dragging) our current center should be the mapcenter (fitBounds..)
            // ### TODO: dont query if given location and given radius "equals" our latest "query settings"
            kiezatlas.do_circle_search(leafletMap.get_current_location_coords(), e.detail)
            kiezatlas.do_reverse_geocode()
        })
        leafletMap.listen_to('locating_success', function(e) {
            leafletMap.set_current_location_coords(new L.latLng(e.detail.latitude, e.detail.longitude))
            leafletMap.activate_circle_control()
            leafletMap.render_circle_search_control()
            kiezatlas.do_circle_search(leafletMap.get_current_location_coords(), undefined)
            leafletMap.set_map_fit_bounds(leafletMap.get_circle_control_bounds())
            kiezatlas.do_reverse_geocode()
        })
        leafletMap.listen_to('locating_error', function(e) {
            leafletMap.render_circle_search_control()
            kiezatlas.render_current_location_label()
            kiezatlas.do_circle_search(undefined, undefined)
            kiezatlas.do_reverse_geocode()
        })
        // kiezatlas.render_browser_location_button()
        kiezatlas.render_current_location_label()
        leafletMap.render_circle_search_control()
    },

    render_mobile: function() {
        // 1) switch to "Orte" tab
        citymap.clear_and_select_places_tab()
        // 2) render a plain listing of all items in this amp
        var places = leafletMap.get_items()
        for (var p in places) {
            citymap.render_mobile_details_card(places[p])
        }
        $('#detail-area .mobile-load').hide()
    },

    render_mobile_details_card: function(object) {
        // _append_ to dom
        if (obj != null) {
            var unconfirmedClass = (object.unconfirmed) ? " unconfirmed" : ""
            $('#detail-area').append('<div class="entry-card' + unconfirmedClass + '" id="details-'+object.id+'">'
                + '<h3>'+object.name+'</h3>'
                + '<div class="details">'
                + '<p>' + object.anschrift + '<br/>'
                + '</p>'
                // + '<a href="/website/geo/' + object.id + '" title="Zeige Details">mehr Infos</a>'
                + '<a href="javascript:citymap.show_selected_detail(' + object.id + ', false)" title="Zeige Details">mehr Infos</a>'
                + '<a href="https://fahrinfo.bvg.de/Fahrinfo/bin/query.bin/dn?Z=' + encodeURIComponent(object.anschrift)
                    + '&REQ0JourneyStopsZA1=2&start=1&pk_campaign=kiezatlas.de">'
                    + '<img src="/de.kiezatlas.website/images/fahrinfo.gif"></a>'
                + '</div>'
            + '</div>')
            /** var $item = create_list_item(object)
            $item.click(function(e) {
                var itemId = e.target.getAttribute(DATA_TOPIC_ID)
                if (!itemId) itemId = e.delegateTarget.getAttribute(DATA_TOPIC_ID)
                citymap.show_selected_detail(object.id, true)
            })
            $('#detail-area .results').append($item) **/
            $('#detail-area .mobile-load').show()
        }
    },

    show_selected_details: function(result_list) {
        var list_geo_object_ids = []
        for (var i in result_list) {
            var marker_id = result_list[i].options['id']
            list_geo_object_ids.push(marker_id)
            citymap.show_selected_detail(marker_id, false)
        }
    },

    clear_and_select_places_tab: function() {
        $('.tabular.menu .item').tab('change tab', 'first')
        $('#detail-area .search-option.d').remove()
        $('#detail-area .entry-card').remove()
    },

    show_selected_detail: function(marker_id, focusOnMap) {
        // 1) switch to "Orte" tab
        citymap.clear_and_select_places_tab()
        // 2) highlight/focus marker on map
        leafletMap.highlight_geo_object_marker_by_id(marker_id, focusOnMap)
        // 2) load basics
        karestc.load_geo_object_detail(marker_id, function(result) {
            citymap.render_selected_detail(result)
            // 2.1) load facets
            karestc.load_facetted_geo_object(marker_id, kiezatlas.get_site_id(), function(obj) {
                citymap.render_geo_object_facets(obj)
            })
            // 2.2) display angebote in an extra tab
            // ### TODO: angebote angebote.load_geo_objects_angebote(list_geo_object_ids)
        })
    },

    clear_details_area: function() { // remove duplicate, see ka-website.js
        $('.search-option.d').remove()
        var $entryCards = $('.entry-card')
        $entryCards.hide(200, "linear", function () { $entryCards.remove() })
    },

    render_selected_detail: function(object) {
        // var imprint_html = kiezatlas.get_imprint_html(object)
        var contact = object.kontakt
        // var opening_hours = object.oeffnungszeiten
        var lor_link = kiezatlas.get_lor_link(object)
        var fahrinfoLink = '<a href="https://fahrinfo.bvg.de/Fahrinfo/bin/query.bin/dn?Z=' + object.address_name.toString()
                + '&REQ0JourneyStopsZA1=2&start=1&pk_campaign=kiezatlas.de">'
                + '<img src="/de.kiezatlas.website/images/fahrinfo.gif"></a>'
        var ortseintrag_link = '/website/geo/' + object.id
        var angebote_link = ''
        if (object.angebote_count > 0) {
            angebote_link = '<div class="angebote-link">'
                + '<a class="button" href="' + ortseintrag_link + '">Aktuelle Angebote anzeigen</a></div>'
        }
        if (kiezatlas.get_site_info() && !kiezatlas.get_site_info().fahrinfoLink) {
            console.log("Website info", kiezatlas.get_site_info())
            fahrinfoLink = ''
        }
        var body_text = ""
        // if (description) body_text += '<p><b>Info</b> ' + description + '</p>'
        if (typeof contact !== "undefined" && contact.value.length > 0) {
            // var fax = undefined, email = undefined, telefon = undefined, person = undefined
            var contact_text = "<br/>"
            // skipping ansprechpartner and email
            if (contact.childs.hasOwnProperty('ka2.kontakt.telefon')
                && contact.childs['ka2.kontakt.telefon'].value.length > 0) {
                contact_text += 'Tel.: ' + contact.childs['ka2.kontakt.telefon'].value  + '<br/>'
            }
            if (contact.childs.hasOwnProperty('ka2.kontakt.fax')
                && contact.childs['ka2.kontakt.fax'].value.length > 0) {
                contact_text += 'Fax: ' + contact.childs['ka2.kontakt.fax'].value
            }
            body_text += '<p><b>Kontakt</b>' + contact_text + '</p>'
        }
        var unconfirmedClass = (object.unconfirmed) ? " unconfirmed" : ""
        $('#detail-area').append('<div class="entry-card' + unconfirmedClass + '" id="details-'+object.id+'">'
            + '<h3>'+object.name+'</h3>'
            + '<div class="details">'
            + '<p>'
                + object.address_name.toString() + '<br/>'
                + '' + body_text + ''
            + '</p>'
            + angebote_link
            + '<div class="facets"></div>'
            // + '<a href="/website/geo/' + object.id + '" class="mobile-more" title="Zeige Details">mehr Infos</a>'
            + '<a href="' + ortseintrag_link + '">Weitere Infos</a>'
            + fahrinfoLink
            + '</div>'
            + lor_link
        + '</div>')
    },

    render_geo_object_facets: function(geoobject) {
        if (!facetTypeDefs) {
            console.warn("Could not load facetTypeDefs", facetTypeDefs)
            return
        }
        var $facetForm = $('#details-' + geoobject.id + ' .facets')
        for (var fi in facetTypeDefs) {
            var facetTopicType = facetTypeDefs[fi]
            // Analyze Type Definition
            var facetTypeUri = citymap.get_first_child_type_uri(facetTopicType)
            var assocDefType = facetTopicType.assoc_defs[0].type_uri
            var assocDefCardinality = facetTopicType.assoc_defs[0].child_cardinality_uri
            var facetValueTopics = geoobject.childs[facetTypeUri]
            // console.log("Geo Object Facet", facetValueTopics, facetTypeUri, assocDefType, assocDefCardinality)
            // Construct Label and Container
            var facetName = (facetTopicType.value.indexOf(" Facet") != -1) ? facetTopicType.value.replace(" Facet", "") : facetTopicType.value
            var $facetLabel = $('<div class="facet">' + facetName + '</div>')
            var $facetLabelDiv = $('<div class="facet-values">')
            var $facetValue = $('<span class="values">')
            // Helper to initialize the correct input field options on demand
            var valuesExist = true
            // Composition Definition (currently just ONE)
            if (assocDefType.indexOf("composition_def") !== -1) {
                if (assocDefCardinality.indexOf("many") !== -1) { // many, demo just the first value
                    if (facetValueTopics.length > 0) {
                        $facetValue = $('<span class="composition-def-many values">')
                        if (facetValueTopics[0]) {
                            $facetValue.html(facetValueTopics[0].value)
                        }
                    } else {
                        valuesExist = false
                    }
                } else {
                    if (facetValueTopics) {
                        $facetValue = $('<span class="composition-def-one values">')
                        // build a hyperlink-hack
                        if (facetName.indexOf("Link") !== -1 && facetValueTopics.value.indexOf("http") !== -1) {
                            $facetValue.html("<a target=\"_blank\" href=\""+facetValueTopics.value+"\">"+facetValueTopics.value+"</a>")
                        } else {
                            $facetValue.html(facetValueTopics.value)
                        }
                    } else {
                        valuesExist = false
                    }
                }
            // Aggregation_def, selector (ONE or MANY)
            } else if (assocDefType.indexOf("aggregation_def") !== -1) {
                if (assocDefCardinality.indexOf("many") !== -1) {
                    $facetValue = $('<ul class="aggregated-def-many values" id="'+facetTopicType.uri+'">')
                    for (var fi in facetValueTopics) {
                        var facetValueOption = facetValueTopics[fi]
                        var $facetInputOption = $('<li>' + facetValueOption.value + '</li>')
                        $facetValue.append($facetInputOption)
                    }
                    if (facetValueTopics.length === 0) {
                        valuesExist = false
                    }
                } else {
                    $facetValue = $('<ul class="aggregated-def-one values" id="'+facetTopicType.uri+'">')
                    if (facetValueTopics) {
                        $facetValue.append($('<li>' + facetValueTopics.value + '</li>'))
                    } else {
                        valuesExist = false
                    }
                }
            }
            if (valuesExist) {
                $facetLabelDiv.append($facetValue)
                $facetLabel.append($facetLabelDiv)
                $facetForm.append($facetLabel)
            }
        }
    },

    get_first_child_type_uri: function(topicType) {
        var childType = topicType.assoc_defs[0]
        if (childType.role_2.role_type_uri === "dm4.core.child_type") {
            return childType.role_2.topic_uri
        } else {
            return childType.role_1.topic_uri
        }
    },

    render_info_area: function(siteTopic) {
        $('.citymap-title').text(siteTopic.value)
        $('.welcome .title').text(siteTopic.value)
        $('.welcome .slogan').text('')
        $('#sidebar .imprint').html('<a href="'+siteTopic.imprint+'" target="_blank">Impressum</a>')
        $('.welcome .logo').attr("src", siteTopic.logo).attr("title", "Logo " + siteTopic.value)
        $('#sidebar .content-area').html(siteTopic.html)
    },

    // requires a certain dom structure and an instance of ka-website.js as "kiezatlas"
    do_citymap_fulltext_search: function(query) {
        kiezatlas.do_text_search_geo_objects(query.trim(), function(geoobjects) {
            hide_loading_indicator()
            // switch to results tab
            if ($('.tabular.menu #search-tab').length === 0) {
                $('.tabular.menu').append('<div id="search-tab" class="item" data-tab="third">Suche</div>')
            }
            $('.tabular.menu .item').tab('change tab', 'third')
            // render list of results in orte section
            var $ul = $('#search-area ul.results')
            if (geoobjects.length > 0) {
                $ul.empty()
            }
            // sorted?
            for (var geoidx in geoobjects) {
                var obj = geoobjects[geoidx]
                var $item = create_list_item(obj)
                $item.click(function(e) {
                    var itemId = e.target.getAttribute(DATA_TOPIC_ID)
                    if (!itemId) itemId = e.delegateTarget.getAttribute(DATA_TOPIC_ID)
                    citymap.show_selected_detail(itemId, true)
                })
                $ul.append($item)
            }
        })
        show_loading_indicator()
    },

    select_criteria: function(critName, criteriaId) {
        if ($('.tabular.menu #category-tab').length === 0) {
            $('.tabular.menu').append('<div id="category-tab" class="item" data-tab="fourth">Kategorien</div>')
        }
        $('#category-area .title.criteria').text(critName)
        $('#category-area .title.criteria').attr(DATA_TOPIC_ID, criteriaId)
        $('#category-area .title.criteria').unbind("click")
        $('#category-area .title.criteria').bind("click", function(e) {
            citymap.select_criteria(critName, criteriaId)
        })
        $('.tabular.menu .item').tab('change tab', 'fourth')
        var $ul = $('#category-area ul.results')
            $ul.removeClass("cats")
            $ul.empty()
        karestc.load_topics_by_type(criteriaId, function(categories) {
            // console.log("Loaded Categories", categories)
            for (var c in categories) {
                var cat = categories[c]
                var $listitem = $("<li id=\"" + cat.id + "\" data-topic-id=\"" + cat.id + "\">"
                        + "<span class=\"label\" data-topic-id=\"" + cat.id + "\">" + cat.value + "</span></li>")
                    $listitem.click(function(e) {
                        var categoryId = e.target.getAttribute(DATA_TOPIC_ID)
                        citymap.select_category(categoryId)
                    })
                $ul.append($listitem)
            }
            // ...
        })
    },

    select_category: function(categoryId) {
        karestc.load_geo_objects_by_category(kiezatlas.get_site_id(), categoryId, function(results) {
            // console.log("Loaded Geo Objects by Category", categoryId, results)
            var $ul = $('#category-area ul.results')
            if (results.length > 0) {
                $ul.addClass("cats")
                $ul.empty()
                for (var r in results) {
                    var geoobject = results[r]
                    var $item = create_list_item(geoobject)
                    $item.click(function(e) {
                        var itemId = e.target.getAttribute(DATA_TOPIC_ID)
                        if (!itemId) itemId = e.delegateTarget.getAttribute(DATA_TOPIC_ID)
                        citymap.show_selected_detail(itemId, true)
                    })
                    $ul.append($item)
                }
            } else {
                $("#" + categoryId).append("<span class=\"status\">(Keine Treffer)</span>")
            }
        })
    },

    // require a certain dom structure and an instance of ka-map.js as "leafletMap"
    register_page_handlers: function() {

        $(window).resize(function() {
            setTimeout(function() {
                leafletMap.fit_to_height(81)
                citymap.set_sidebar_height()
            }, 350)
        })

        // add click and touch handlers on our "three near by options"
        // kiezatlas.add_nearby_button_handler()

        $('.citymap .ui.search input').keyup(function(e) {
            if (e.target.value.length >= 3 && e.keyCode === 13) {
                citymap.do_citymap_fulltext_search(e.target.value)
            }
        })

        $('.citymap .ui.search button').click(function(e) {
            var query = $('.citymap .ui.search input').val()
            if (query.length >= 3) {
                citymap.do_citymap_fulltext_search(query)
            }
        })

        leafletMap.listen_to('marker_select', function(e) {
            $('.tabular.menu .item').tab('change tab', 'first')
        })

        // Activate register cards/tabs menu
        $('.tabular.menu .item').tab()

    },

    render_criteria_menu: function(criterias)  {
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
                    citymap.select_criteria(e.target.text, e.target.id)
                })
            $list.append($item.append($link))
        }
    },

    set_sidebar_height: function() {
        if ($('#karte').css("display") === "none") {
            $('#sidebar').height(window.innerHeight - 4)
        } else {
            $('#sidebar').height(window.innerHeight - 36)
        }
    }

}
