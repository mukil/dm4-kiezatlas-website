var URL_ANGEBOT_LISTING     = "/angebote/"
var URL_MY_ANGEBOT_LIST     = "/angebote/my"
var URL_ANGEBOT_DETAIL      = "/angebote/"
var URL_ANGEBOT_EDIT        = "/angebote/edit/"
var URL_ANGEBOT_ASSIGNMENT  = "/angebote/zuordnen/"
var URL_EINRICHTUNG_EDIT    = "/website/geo/edit/"
var URL_EINRICHTUNG         = "/website/geo/"
var URL_EINRICHTUNG_CREATE  = "/website/geo/create/simple"

var list = (function($) {
    
    console.log("Kiezatlas Administration Script loaded")
    
    var api = {} 
    
    /** Model: */
    var objects =  []
    var district = { id: 7275 }
    var usernames = []
    // selected geo object
    var selected_geo = undefined
    var view_permissions = undefined
    var geo_object = undefined

    api.init_page = function() {
        /** var districtId = parseInt(window.location.href.slice(window.location.href.lastIndexOf("/") +1))
        restc.load_district_regions(districtId, function(results) {
            console.log("Loaded list of bezirskregionen", results)
        }) **/
    }

    api.void = function() {
        // void
    }

    api.render_user_assignments_page = function() {
        // console.log("Rendered user assignment page...", window.document.location.hash)
        // Init with 1) geo object id 2) search term or 3) blank
        var pageId = window.document.location.hash
        var placeId = -1
        if (pageId.indexOf("id") !== -1) {
            // initalize geo object and assignees..
            placeId = pageId.substr(4)
        } else if (pageId.indexOf("query") !== -1) {
            // initialize search...
            var query = pageId.substr(7)
            if (query.indexOf(";bezirk=") !== -1) {
                // set district filter
                var values = query.split(";bezirk=")
                query = values[0]
                $('#district-filter').val(values[1])
                $("#name-search").val(query)
                set_search_district_filter()
            } else {
                $("#name-search").val(query)
                do_search_geo_objects_by_name(render_geo_object_search_results) // calls render function in 'edit-angebote.js'   
            }
        }
        $("#name-search").on("keyup", api.handle_name_search_input)
        $("#do-search").on("click", function(e) {
            api.assignment_geo_object_search(render_geo_object_search_results) // calls render function in 'edit-angebote.js'
        })
        $('.assign-username.ui.dropdown').dropdown({
            placeholder: "Benutzer auswählen"
        })
        $sidebarUi = $('.ui.sidebar').sidebar('setting', 'dimPage', false)
        restc.load_view_permissions(function(info) {
            console.log("User has permissions on", info)
            view_permissions = info
            api.show_assigned_usernames(placeId)
        })
    }

    api.handle_name_search_input = function (e) {
        if (e.keyCode === 13) {
            api.assignment_geo_object_search(render_geo_object_search_results) // calls render function in 'edit-angebote.js'
        }
    }

    api.show_current_name = function(topicId) {
        restc.load_geo_object_detail(topicId, function(response) {
            geo_object = response
            if (api.topic_list_contains_value(view_permissions.bezirksregionen, response.bezirksregion)
             || api.topic_list_contains_value(view_permissions.bezirke, response.bezirk)) {
                $('h3 .angebot-name').text(response.name)
            } else {
                $('h3 .angebot-name').text('Sie haben keine Berechtigung diese Informationen einzusehen.')
            }
        })
    }

    api.topic_list_contains_value = function(list, value) {
        for (var el in list) {
            if (list[el].value === value) return true
        }
        return false
    }

    api.assignment_geo_object_search = function(callback) {
        var queryString = do_search_geo_objects_by_name(callback)
        // do url..
        window.document.location.hash = "query=" + queryString
    }

    api.show_assigned_usernames = function (topicId) {
        if (topicId && topicId !== -1) {
            window.document.location.hash = "id=" + topicId
            // display username select box
            api.load_assigned_usernames(topicId, api.render_user_assignments, false)
            api.show_current_name(topicId)
        }
    }

    api.toggle_item_list = function(e) {
        var region = $(e).attr("data-custom-id")
        if ($('#' + region + ' .einrichtungen .items').hasClass('hidden')) {
            $('#' + region + ' .einrichtungen .items').removeClass('hidden')
        } else {
            $('#' + region + ' .einrichtungen .items').addClass('hidden')
        }
    }

    api.search_usernames = function(input, callback) {
        //
        console.log("Search for users \"" + input.trim() + "\"")
    }

    api.do_assign_ansprechpartner = function() {
        var selectedValue = $('.add-assignment .assign-username').dropdown('get value')
        // var $selectedOption = $('.add-assignment .assign-username .selected')
        // console.log("Selected Username for Assignment", $selectedOption, "Dropdown API selectedValue", selectedValue)
        var userId = parseInt(selectedValue)
        console.log("Selected Username for Assignment", userId)
         if (selected_geo) {
            console.log("Assigning user to ", selected_geo)
            api.do_assign_user(selected_geo, userId)
        } else {
            alert("Sie müssen zuerst ein Ortsdatensatz auswählen. Nutzen Sie dafür bitte die Suche auf der linken Seite, danke!")
        }
    }

    api.do_assign_editor = function(topicId) {
        var selectedValue = $('#' + topicId + ' .assign-username').dropdown('get value')
        // console.log("Selected Dropdown Value", selectedValue)
        // var $selectedOption = $('#' + topicId + ' .assign-username .selected')
        // var userId = parseInt($selectedOption.attr('data-value'))
        var userId = parseInt(selectedValue)
        console.log("Selected Username for Assignment", userId)
        api.do_assign_user(topicId, userId)
    }

    api.do_assign_user = function(topicId, userId) {
        // if (givenUserId) userId == givenUserId
        if (userId !== -1 && !isNaN(userId) && topicId) {
            console.log("Create Assign User", topicId, userId)
            restc.create_user_assignment(topicId, userId, function(response) {
                console.log("Attempt to create a kiezatlas user assignment", response)
                if (response.state === "ok") window.document.location.reload()
            })
        } else {
            console.error("Bad parameters for assignment request topicId", topicId, "userId", userId)
        }
    }

    api.do_remove_assignment = function(topicId, userId) {
        if (userId !== -1 && !isNaN(userId)) {
            console.log("Remove User Assignment", topicId, userId)
            restc.delete_user_assignment(topicId, userId, function(response) {
                console.log("Attempt to delete a kiezatlas user assignment", response)
                if (response.state === "ok") window.document.location.reload()
            })
        }
    }

    api.do_remove_geo_assignment = function(topicId, userId) {
        if (userId !== -1 && !isNaN(userId)) {
            console.log("Remove User Assignment", topicId, userId)
            restc.delete_user_assignment(topicId, userId, function(response) {
                console.log("Attempt to delete a kiezatlas user assignment", response)
                if (response.state === "ok") window.document.location.reload()
            })
        }
    }

    api.load_assigned_usernames = function(geoObjectId, renderer) {
        console.log("Load assigned usernames for \"" + geoObjectId + "\"")
        $.ajax({
            type: "GET", url: "/website/list/assignments/" + geoObjectId,
            success: function(response) {
                if (response) {
                    selected_geo = geoObjectId
                    usernames = response
                    console.log("Loaded Geo Object (" + selected_geo + ") User Assignments ", response)
                    if (renderer) renderer(response)
                } else {
                    $('#user').html('Bitte <a href="/sign-up/login">loggen</a> sie sich ein um Zuordnungen zu bearbeiten.')
                    $('.task-info').addClass('disabled')
                    $('div.angebot-area').addClass('disabled')
                    usernames = []
                }
            },
            error: function(x, s, e) {
                selected_geo = undefined
                usernames = []
                console.warn("ERROR", "x: ",x, " s: ", s," e: ", e)
            }
        })
    }

    api.set_district = function(id) {
        if (id) district.id = id
        $('.district-links .button').removeClass('selected')
        $('#' + district.id).addClass('selected')
    }

    api.render_bezirk_links = function() {
        restc.load_district_topics(function(districts) {
            var $links = $(".district-links")
                $links.empty()
            for (var i in districts) {
                var district = districts[i]
                $links.append('<a id="'+district.id+'" class="button"'
                    + 'href="javascript:list.load_geo_objects('
                    + district.id + ', list.render_list)">'
                    + district.value + '</a>&nbsp;')
            }
            api.set_district()
        })
    }

    api.render_user_assignments = function () {
        // Display Assignments on Assignment Page
        $('.right-side div.einrichtungen').empty()
        if (usernames.length === 0) {
            $('.right-side .help').html('<p>Diesem Ortsdatensatz ist noch kein Kiezatlas 2 Account zugewiesen. Zur Zuweisung w&auml;hlen Sie '
                + 'bitte &uuml;ber die linke Seite des Bildschirms einen Ortsdatensatz aus. <p>Nach erfolgter Zuweisung taucht dieser Ort f&uuml;r diese/n Benutzer_in unter <em>Meine Einträge</em> &gt; <em>Meine Orte</em> auf.</p>')
        } else {
            // $('.help').html('Um einen Zeitraum zu aktualisieren w&auml;hlen Sie diesen bitte aus.')
            $('.right-side .help').empty()
        }
        // ### show address or districts, too
        for (var i in usernames) {
            var obj = usernames[i]
            // console.log("Assigned user is", obj)
            // var startDate = $.datepicker.formatDate('DD, dd.mm yy', new Date(obj.anfang_timestamp));
            var $element = $('<div id="' + obj.id + '" class="concrete-assignment" '
                + ' title="Zum bearbeiten dieser Zuweisung bitte Klicken"><h3>' + obj.value + '</h3>'
                + '<button class="ui button basic circle remove compact" onclick="list.do_remove_assignment(' + selected_geo + ', ' + obj.id + ')" '
                    + 'title="Diesen Ansprechpartner/in f&uuml;r diese Bezirksregion zur&uuml;ckziehen">'
                    + '<i class="icon close"></i>Entfernen</button>'
                + '</div>')
            $('.right-side div.einrichtungen').append($element)
        }
        // equip all buttons with a click handler each (at once)
        $('.right-side .einrichtungen').on('click', api.select_user_assignment)
    }

    api.select_user_assignment = function (event) {
        var element = event.target
        var id = (element.localName === "div") ? element.id : ""
        if (element.localName === "h3" || element.localName === "p") {
            id = element.parentNode.id
        } else if (element.localName === "div") {
            id = element.id
        } else if (element.localName === "i") {
            id = element.parentNode.parentNode.id
        }
        if (id) {
            console.log("Selected geo object assigned username", id, "render form...")
            /** selected_assignment_infos = get_assignment_edge(id)
            selected_assignment_edge = restc.get_association_by_id(id, true) // include children=True
            render_assignment_form() **/
        } else {
            console.warn("Could not detect click on Element", element, event)
        }
        return event
    }

    api.render_menu = function(status) {
        if (status) {
            $('.login').remove()
        }
    }

    api.render_page = function(status) {
        if (status) {
            api.load_geo_objects(district.id, api.render_list)
            list.render_menu(status)
            list.render_bezirk_links()
        }
        console.log("Render Page", status)
    }
    
    return api

}($))