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
                        'src/main/resources/web/css/semantic-ui/2.2/components/menu.min.css'
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
                        'src/main/resources/web/ka-website.js'
                    ]
                }
            },
            jQuery: {
                files: {
                    'src/main/resources/web/dist/vendor/jquery-1.9.1-ui-1.9.2.min.js': [
                        'src/main/resources/web/vendor/jquery/jquery-1.9.1.min.js',
                        'src/main/resources/web/vendor/jquery/ui/js/jquery-ui-1.9.2.custom.min.js'
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
            }
        },
        uglify: {
            all: {
                files: {
                    'src/main/resources/web/dist/website-frontpage.min.js': ['src/main/resources/web/dist/ka-website-frontpage.js']
                }
            }
        }
    })

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.registerTask('default', ['concat']);

};

