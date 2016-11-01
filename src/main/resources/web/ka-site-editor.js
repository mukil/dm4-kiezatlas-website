/**
 * Depends on jQuery 1.9.1, DeepaMehta's js_utils.js and ka-restclient.js
 * @type type
 */

var sites = {

    siteId: undefined,
    objectId: undefined,
    geoobject: undefined,
    facetTypes: undefined,

    init_list: function() {
        restc.load_websites(function(sites) {
            for (var s in sites) {
                var site = sites[s]
                console.log("Loaded Site", site)
                var webAlias = site.childs['ka2.website.web_alias']
                if (webAlias) {
                    webAlias = site.childs['ka2.website.web_alias'].value
                }
                var $html = $("<li><h3>"+ site.value + ", Web Alias <span class=\"webalias\">/"+webAlias+"</span></h3>"
                    + "<button class=\"ui button basic small\" onclick=\"sites.go_to_site_edit("+site.id+")\">Bearbeiten</button>"
                    + "<button class=\"ui button basic small\" onclick=\"sites.go_to_site('"+webAlias+"')\" title=\""+site.value+" aufrufen\">Aufrufen</a>"
                    + "</li>")
                $('.listing .sites').append($html)
            }
        })
    },
    init_site_editor: function() {
        // set ka_site_id cookie
        siteId = $('.editor .site').attr("id")
        console.log("Initializing single site editor, Set ka2_site_id cookie", siteId)
        js.set_cookie("ka2_site_id", siteId)
        // Register two handlers for search input
        $('.sites .ui.search input').keyup(function(e) {
            if (e.target.value.length >= 3 && e.keyCode === 13) {
                sites.do_citymap_fulltext_search(e.target.value)
            }
        })
        $('.sites .ui.search button').click(function(e) {
            console.log("Klicked search button..", e)
            var query = $('.sites .ui.search input').val()
            if (query.length >= 3) {
                sites.do_citymap_fulltext_search(query)
            }
        })
    },
    activate_options: function(typeUri, facetTopicTypeUri, addEmpty, existingMany) {
        var facetTypeUriInputFieldSelector = facetTopicTypeUri.split(".").join("\\.")
        $('#' + facetTypeUriInputFieldSelector).removeAttr("disabled")
        sites.load_facet_value_options(typeUri, facetTopicTypeUri, addEmpty, existingMany)
    },
    load_facet_value_options: function(typeUri, facetTopicTypeUri, addEmpty, existingMany) {
        restc.load_topics_by_type(typeUri, function(results) {
            var facetTypeUriInputFieldSelector = facetTopicTypeUri.split(".").join("\\.")
            var $selectBox = $('#' + facetTypeUriInputFieldSelector)
            if ($selectBox.attr("data-initalized")) {
                return;
            }
            $('#' + facetTypeUriInputFieldSelector + ' option').remove()
            if (addEmpty) {
                $selectBox.append($('<option>Bitte ausw&auml;hlen</option>'))
            }
            for (var r in results) {
                var result = results[r]
                var selectedAttr = (check_if_selected(result, existingMany)) ? 'selected="true" ' : '';
                $selectBox.append('<option value="' + result.id + '" ' + selectedAttr + '>' + result.value + '</option>')
            }
            $selectBox.attr("data-initalized", true)
        })
        function check_if_selected(result, existingMany) {
            if (existingMany) {
                for (var g in geoobject.childs[result.type_uri]) {
                    var value = geoobject.childs[result.type_uri][g]
                    if (value.id === result.id) return true
                }
            } else {
                var value = geoobject.childs[result.type_uri]
                if (value && value.id === result.id) return true
            }
            return false
        }
    },
    add_facet_input_field: function(typeUri) {
        console.log("Add input field for facetTypeUri", typeUri)
    },
    init_facet_editor: function() {
        siteId = $('.editor .site').attr("id")
        objectId = $('.facet-editor .object').attr("id")
        console.log("Initializing object facet editor...", objectId, "for site", siteId)
        restc.load_facetted_geo_object(objectId, siteId, function(object) {
            console.log("Loaded Facetted Geo Object", object)
            geoobject = object
            restc.load_website_facets(siteId, function(facetTypes) {
                console.log("Loaded Websites Facet Type Definitions", facetTypes)
                sites.render_facet_form(facetTypes)
            })
        })
    },
    render_facet_form: function(facetTypeDefs) {
        var $facetForm = $('#facets').html('<div class="ui input">')
        for (var fi in facetTypeDefs) {
            var facetTopicType = facetTypeDefs[fi]
            // Analyze Type Definition
            var facetTypeUri = get_first_child_type_uri(facetTopicType)
            var assocDefType = get_first_assoc_def_type(facetTopicType)
            var assocDefCardinality = get_first_assoc_def_child_cardinality(facetTopicType)
            var facetValueTopics = geoobject.childs[facetTypeUri]
            console.log("Geo Object Facet", facetValueTopics, facetTypeUri, assocDefType, assocDefCardinality)
            // Construct Label and Container
            var $facetLabel = $('<label class="label" for="'+facetTypeUri+'">'+facetTopicType.value+'</label>')
            var $facetLabelDiv = $('<div class="ui input">')
            // Default Text Input Field
            var $facetInput = $('<input class="ui input" type="text" id="'+facetTopicType.uri+'" name="'+facetTypeUri+'">')
            // Helper to initialize the correct input field options on demand
            var addEmptyOption = false
            var existingMany = false
            // Composition Definition (currently just ONE)
            if (assocDefType.indexOf("composition_def") !== -1) {
                if (assocDefCardinality.indexOf("many") !== -1) { // many, demo just the first value
                    // ### allow to add many and remove existing
                    if (facetValueTopics[0]) $facetInput.val(facetValueTopics[0].value) // simple input field
                } else {
                    if (facetValueTopics) $facetInput.val(facetValueTopics.value) // single input field, one
                }
            // Aggregation_def, selector (ONE or MANY)
            } else if (assocDefType.indexOf("aggregation_def") !== -1) {
                if (assocDefCardinality.indexOf("many") !== -1) {
                    $facetInput = $('<select disabled="true" multiple="true" class="ui input" id="'+facetTopicType.uri+'" name="'+facetTypeUri+'">')
                        // onfocus="sites.load_facet_value_options(\''+facetTypeUri+'\', \''+facetTopicType.uri+'\', false)"
                    for (var fi in facetValueTopics) {
                        var facetValueOption = facetValueTopics[fi]
                        var $facetInputOption = $('<option selected="true" value="'+facetValueOption.id+'">' + facetValueOption.value + '</option>')
                        $facetInput.append($facetInputOption)
                    }
                    existingMany = true
                } else {
                    $facetInput = $('<select disabled="true" class="ui input" id="'+facetTopicType.uri+'" name="'+facetTypeUri + '">')
                        // +'" onfocus="sites.load_facet_value_options(\''+facetTypeUri+'\', \''+facetTopicType.uri+'\')
                    if (facetValueTopics) {
                        $facetInput.append($('<option selected="true" value="'+facetValueTopics.id+'">' + facetValueTopics.value + '</option>'))
                    } else {
                        addEmptyOption = true
                        sites.load_facet_value_options(facetTypeUri, facetTopicType.uri, true)
                    }
                }
            }
            $facetLabelDiv.append($facetInput)
            if (assocDefType.indexOf("aggregation_def") !== -1) {
                var $button = $('<span class="ui button basic small" '
                    + 'onclick="sites.activate_options(\'' + facetTypeUri + '\', \''+facetTopicType.uri+'\', ' + addEmptyOption + ', '+existingMany+')">').text("Bearbeiten")
                $facetLabelDiv.append($button)
            }
            $facetLabel.append($facetLabelDiv)
            $facetForm.append($facetLabel)
        }
        
        // --- Form Render Helper Methods

        function get_first_assoc_def_type(topicType) {
            return topicType.assoc_defs[0].type_uri
        }

        function get_first_assoc_def_child_cardinality(topicType) {
            return topicType.assoc_defs[0].child_cardinality_uri
        }

        function get_first_child_type_uri(topicType) {
            var childType = topicType.assoc_defs[0]
            if (childType.role_2.role_type_uri === "dm4.core.child_type") {
                return childType.role_2.topic_uri
            } else {
                return childType.role_1.topic_uri
            }
        }

    },
    assign_to_site: function(id) {
        restc.create_website_assignment(id, siteId, function(response) {
            console.log("Added object to site", id, siteId)
            if (response.state === "ok") {
                $('#dialog-confirm').html('<p>Der Einrichtungsdatensatz wurde diesem Stadtplan erfolgreich hinzugef&uuml;gt</p>'
                    + '<p>Um das Ergebnis zu sehen laden Sie diese Seite bitte einmal neu.</p>')
                $("#dialog-confirm").dialog({ resizable: false, height: "auto", width: 420, modal: true,
                    buttons: {
                        "Neu laden": function() {
                            window.document.location.reload()
                            $( this ).dialog( "close" );
                        },
                        "Nein, danke": function() {
                            $( this ).dialog( "close" );
                        }
                    }
                })
            }
            sites.handle_response_err(response)
        })
    },
    remove_assignment: function(id, site) {
        restc.load_geo_object_detail(id, function(result) {
            console.log("Remove geo object from site", id, "Site", site)
            $('#dialog-confirm').html("<p>Aufhebung der Zuweisung dieses Einrichtungsdatensatzes zu diesem Stadtplan?</p>"
                + "<p><b>" + result.name + "</b></p><p>Anschrift:<br/>" + result.anschrift + "</p>")
            $("#dialog-confirm").dialog({ resizable: false, height: "auto", width: 420, modal: true,
                title: "Zuweisung aufheben?",
                buttons: {
                    "Ja": function() {
                        restc.remove_website_assignment(id, site, function(response) {
                            $('#' + id).hide("slow")
                            sites.handle_response_err(response)
                        })
                        $( this ).dialog( "close" );
                    },
                    "Nein, danke": function() {
                        $( this ).dialog( "close" );
                    }
                }
            })
        })
    },
    handle_response_err: function(response) {
        if (response.state != "ok") {
            alert("Es ist ein Fehler aufgetreten, bitte probieren Sie es erneut.")
            console.warn(response.detail)
        }
    },
    do_citymap_fulltext_search: function(query) {
        sites.global_geo_object_search(query.trim(), function(geoobjects) {
            $('.sites .ui.search button .icon').removeClass("loading").removeClass("circle").removeClass('notched')
            $('.sites .ui.search button .icon').addClass("search")
            // render list of results in orte section
            var $ul = $('.selector ul.results').empty()
            for (var geoidx in geoobjects) {
                var obj = geoobjects[geoidx]
                var $item = $('<li class="item" id="'+obj.id+'"><h3>' + obj.name
                    + ', <span class="anschrift">'+obj.anschrift.replace(" Deutschland", "") +'</span></h3>'
                    + '<a href="javascript:sites.assign_to_site('+obj.id+')">In den Stadtplan mit aufnehmen</a></li>')
                $ul.append($item)
            }
        })
        $('.sites .ui.search button .icon').addClass("loading").addClass("circle").addClass('notched')
        $('.sites .ui.search button .icon').removeClass("search")
    },
    global_geo_object_search: function(text, callback) {
        var queryUrl = '/geoobject/search/?search='+text
        $.getJSON(queryUrl, function (geo_objects) {
            if (callback) callback(geo_objects)
        })
    },
    go_to_site_edit: function(siteId) {
        window.location.assign("/geoobject/sites/" + siteId)
    },
    go_to_site: function(webAlias) {
        window.location.assign("/" + webAlias)
    }

}
