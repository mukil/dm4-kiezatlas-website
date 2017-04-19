
var list = (function($) {
    
    console.log("Kiezatlas Administration Script loaded")
    
    var api = {} 
    
    /** Model: */
    var objects =  []
    var district = { id: 7275 }
    var usernames = []

    api.init_page = function() {
        /** var districtId = parseInt(window.location.href.slice(window.location.href.lastIndexOf("/") +1))
        restc.load_district_manager(districtId, function(results) {
            console.log("Loaded list of possible district manager", results)
        })
        restc.load_district_regions(districtId, function(results) {
            console.log("Loaded list of bezirskregionen", results)
        }) **/
    }

    api.search_usernames = function(input, callback) {
        //
        console.log("Search for users \"" + input.trim() + "\"")
    }

    api.do_assign_user = function(topicId) {
        var $selectedOption = $('#' + topicId + ' .assign-username .selected')
        console.log("Selected User for Assignment", $selectedOption, $('#' + topicId + ' .assign-username'))
        var userId = parseInt($selectedOption.attr('data-value'))
        if (userId !== -1 && !isNaN(userId)) {
            console.log("Create Assign User", topicId, userId)
            restc.create_user_assignment(topicId, userId, function(response) {
                console.log("Attempt to create a kiezatlas user assignment", response)
                if (response.state === "ok") window.document.location.reload()
            })
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

    api.load_assigned_usernames = function(geoObjectId, callback) {
        // 
        console.log("Load assigned usernames for \"" + geoObjectId + "\"")
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