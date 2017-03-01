module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        concat: {
            semanticss: {
                files: {
                    'src/main/resources/web/css/semantic-ui/2.2/components/ka-website-custom.min.css': [
                        'src/main/resources/web/css/semantic-ui/2.2/components/container.min.css',
                        'src/main/resources/web/css/semantic-ui/2.2/components/dropdown.min.css',
                        'src/main/resources/web/css/semantic-ui/2.2/components/header.min.css',
                        'src/main/resources/web/css/semantic-ui/2.2/components/icon.min.css',
                        'src/main/resources/web/css/semantic-ui/2.2/components/input.min.css',
                        'src/main/resources/web/css/semantic-ui/2.2/components/item.min.css',
                        'src/main/resources/web/css/semantic-ui/2.2/components/menu.min.css',
                        'src/main/resources/web/css/semantic-ui/2.2/components/sidebar.min.css',
                        'src/main/resources/web/css/semantic-ui/2.2/components/button.min.css',
                        'src/main/resources/web/css/semantic-ui/2.2/components/checkbox.min.css'
                    ]
                }
            },
            frontpage: {
                files: {
                    'src/main/resources/web/dist/ka-website-frontpage.js': [
                        'src/main/resources/web/ka-restclient.js',
                        'src/main/resources/web/ka-map.js',
                        'src/main/resources/web/ka-favourites.js',
                        'src/main/resources/web/ka-website-angebote.js',
                        'src/main/resources/web/ka-website.js',
                        'src/main/resources/web/ka-citymap.js',
                        'src/main/resources/web/css/semantic-ui/2.2/sidebar.min.js',
                        'src/main/resources/web/css/semantic-ui/2.2/checkbox.min.js',
			'src/main/resources/web/css/semantic-ui/2.2/api.min.js',
			'src/main/resources/web/css/semantic-ui/2.2/search.min.js'
                    ]
                }
            },
            leaflet: {
                files: {
                    'src/main/resources/web/dist/vendor/leaflet-custom-0.7.7.min.js': [
                        'src/main/resources/web/vendor/leaflet/leaflet.js',
                        'src/main/resources/web/vendor/leaflet/L.CircleEditor.js'
                    ]
                }
            },
            dm4vendor: {
                options: {
                    separator: ';',
                },
                files: {
                    'src/main/resources/web/dist/vendor/dm4-webclient-utils.js': [
                        'src/main/resources/web/vendor/dm4-webclient/util/rest_client.js',
                        'src/main/resources/web/vendor/dm4-webclient/util/js_utils.js'
                    ]
                }
            }
        },
        uglify: {
            all: {
                files: {
                    'src/main/resources/web/dist/ka-website-frontpage.min.js': ['src/main/resources/web/dist/ka-website-frontpage.js'],
                    'src/main/resources/web/dist/vendor/dm4-webclient-utils.min.js': ['src/main/resources/web/dist/vendor/dm4-webclient-utils.js']
                }
            }
        }
    })

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-concat');

    grunt.registerTask('default', ['concat', 'uglify']);

};

