
var favourites = (function($, kiezatlas, PouchDB) {
    console.log("Favourites API Script loaded")

    var api = {}

    var _db = undefined

    // --- Website Plaes Favourites API (PouchDB)

    api.start_local_db = function() {
        // PouchDB.debug.enable('*')
        // PouchDB.debug.disable()
        // TODO: Try/Catch and check if IE is supported!
        _db = new PouchDB('kiezatlas_favourites')
    }

    api.add_entry_to_local_db = function() {
        // TODO; Use POST not PUT to auto-generate IDs
        // ### perform some kind of existence check
        get_next_id(function (next_id) {
            var entry = { _id : next_id, data: kiezatlas.get_current_location() }
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

    api.list_entries_in_local_db = function() {
        _db.allDocs({ include_docs: true, descending: true })
            .then(function (results) {
                if (results.total_rows > 0) {
                    $("#places .entries").empty()
                    for (var i in results.rows) {
                        var entry = results.rows[i]
                        if (typeof entry.doc.data !== "undefined") {
                            var $place_item = $('<li class="ui-menu-item submenu-item"><a id="'+entry.doc._id+'" href="#">' + entry.doc.data.name + '</a></li>')
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

    return api
    
}($, kiezatlas, PouchDB))
