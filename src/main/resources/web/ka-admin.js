
var list = (function($) {
    
    console.log("Kiezatlas Administration Script loaded")
    
    var api = {} 
    
    /** Model: */
    var objects =  []
    var district = { id: 7275 }
    var usernames = []
    
    api.search_usernames = function(input, callback) {
        //
        console.log("Search for users \"" + input.trim() + "\"")
    }

    api.create_user_assignment = function(geoObjectId, username, callback) {
        // 
        console.log("Create user assignment for \"" + geoObjectId + "\" and " + username)
    }

    api.delete_user_assignment = function(geoObjectId, username, callback) {
        // 
        console.log("Remove user assignment for \"" + geoObjectId + "\" and " + username)
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