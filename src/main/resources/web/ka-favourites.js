
var favourites = (function($, PouchDB) {
    console.log("Favourites API Script loaded", PouchDB)

    var api = {}

    var _db = undefined

    // --- Website Plaes Favourites API (PouchDB)

    api.is_available = function() {
        return (!is_msie() && typeof PouchDB !== "undefined") ? true : false
    }

    api.start_local_db = function() {
        // PouchDB.debug.enable('*') // PouchDB.debug.disable()
        if (api.is_available()) {
            _db = new PouchDB('kiezatlas_favourites')
        } else {
            console.log("Could not start PouchDB, possible we're on the MS IE")
        }
    }

    api.list_entries_in_local_db = function() {
        if (_db) {
            _db.allDocs({ include_docs: true, descending: true })
            .then(function (results) {
                if (results.total_rows > 0) {
                    $("#places .entries").empty()
                    for (var i in results.rows) {
                        var entry = results.rows[i]
                        if (typeof entry.doc.data !== "undefined") {
                            var $place_item = $('<li class="ui-menu-item submenu-item">'
                                    + '<a id="'+entry.doc._id+'" href="#">' + entry.doc.data.name + '</a></li>')
                                $place_item.click(function (e) {
                                    _db.get(e.target.id).then(function (doc) {
                                        kiezatlas.show_favourite_location(doc.data)
                                    }).catch(function (err) {
                                        console.warn(err)
                                    })
                                })
                            $("#places .entries").append($place_item)
                        } else {
                            console.warn("Uncorrect entry", entry)
                        }
                    }
                    $("#places").menu({icons: { "submenu" : "ui-icon-grip-dotted-horizontal" } })
                    $("#places").show()
                    $("button.star").removeClass('no-favs')
                }
            }).catch(function (err) {
                console.log(err)
            })
        }
    }

    api.add_entry_to_local_db = function(location) {
        // TODO; Use POST not PUT to auto-generate IDs
        // ### perform some kind of existence check
        if (_db) {
            get_next_id(function (next_id) {
                var entry = { _id : next_id, data: location }
                _db.put(entry)
                api.list_entries_in_local_db()
            })

            function get_next_id(handler) {
                _db.allDocs({include_docs: true})
                    .then(function (result) {
                        var next_id = parseInt(result.total_rows)
                        handler("place_" + next_id)
                    }).catch(function (err) {
                        console.warn(err)
                    })
            }
        }
    }

    // Current MSIE Check here for our PouchDB Favourite Feature courtesy of http://www.javascriptkit.co
    function is_msie() {
        var ie11andabove = navigator.userAgent.indexOf('Trident') != -1 && navigator.userAgent.indexOf('MSIE') == -1 // IE11 or above Boolean
        var ie10andbelow = navigator.userAgent.indexOf('MSIE') != -1 // IE10 or below Boolean
        return (ie11andabove || ie10andbelow)
    }

    return api
    
}($, PouchDB))
