/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var results = []

function init() {
    $('.ui.checkbox').checkbox()
    $('.ui.dropdown').dropdown()
}

function handle_search_input() {
    if (event.keyCode === 13) {
        search(render_results)
    }
}

function render_results() {
    var $container = $('.result-list .container')
        $container.empty()
    if (results.length > 0) {
        show_results_container()
        for (var r in results) {
            var el = results[r]
            var anschrift = (el.anschrift) ? el.anschrift.replace('Berlin Deutschland', '') + ', ' : ''
            $container.append('<div class="item"><h3 class="thin">' + el.name + '</h3>'
                + '<div class="subline">' + anschrift + el.bezirk +'<br/>'
                + '<a href="/website/geo/'+ el.id +'"><i class="icon caret right"></i>mehr Infos</a></div></div>')
        }
    }
}

function search() {
    var text = get_search_input()
    var queryUrl = '/website/search/?search='+text
    /** if (_self.get_site_id()) {
        queryUrl = '/website/search/' + _self.get_site_id() + '/?search=' + text
    } **/
    $.getJSON(queryUrl, function (geo_objects) {
        results = geo_objects
        console.log("results found", results)
        render_results()
    })
}

function get_search_input() {
    return $('#query').val()
}

function toggleSearchCriteria() {
    $('.ui.grid.filter').toggle()
    var $headerIcon = $('.search-criterias .header .caret')
    if ($headerIcon[0].className.indexOf('down') != -1) {
        $headerIcon.addClass('up')
        $headerIcon.removeClass('down')
    } else {
        $headerIcon.addClass('down')
        $headerIcon.removeClass('up')
    }
}

function show_results_container () {
    $('.search-results').removeClass('hidden')
    $('.result-list').removeClass('hidden')
    $('.search-results .header').removeClass('hidden')
}

function hide_results_container () {
    $('.search-results').addClass('hidden')
    $('.result-list').addClass('hidden')
    $('.search-results .header').addClass('hidden')
}

function loadMap() {
    var map = L.map('map').setView([52.484948, 13.344442], 13)
        /**L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map) **/
        L.tileLayer('https://api.tiles.mapbox.com/v4/kiezatlas.pd8lkp64/{z}/{x}/{y}.png?' // old style id="kiezatlas.map-feifsq6f"
            + 'access_token=pk.eyJ1Ijoia2llemF0bGFzIiwiYSI6ImNpa3BndjU2ODAwYm53MGxzM3JtOXFmb2IifQ._PcBhOcfLYDD8RP3BS0U_g', {
            attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors,'
            + '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery &#169; <a href="http://mapbox.com">Mapbox</a>',
            id: 'kiezatlas.m7222ia5'}).addTo(map)
}
