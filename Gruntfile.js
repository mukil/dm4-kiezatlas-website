module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        concat: {
            frontpage: {
                files: {
                    'src/main/resources/web/dist/ka-website-frontpage.js': [
                        'src/main/resources/web/ka-restclient.js',
			'src/main/resources/web/ka-model.js',
                        'src/main/resources/web/ka-map.js',
                        'src/main/resources/web/ka-favourites.js',
                        'src/main/resources/web/ka-website-angebote.js',
                        'src/main/resources/web/ka-website.js',
                        'src/main/resources/web/ka-citymap.js'
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
                    'src/main/resources/web/dist/vendor/dm4-webclient-utils.min.js': ['src/main/resources/web/dist/vendor/dm4-webclient-utils.js'],
                    'src/main/resources/web/dist/ka-startseite.min.js': ['src/main/resources/web/ka-startseite.js']
                }
            }
        }
    })

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-concat');

    grunt.registerTask('default', ['concat', 'uglify']);

};

