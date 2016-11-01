
Kiezatlas Website
#################

This DeepaMehta 4 Plugin is the software module for ship- and development of the rewritten website to be hosted at www.kiezatlas.de. 

It builds on [DeepaMehta 4](https://github.com/jri/deepamehta) (Apache Lucene, Neo4J, Jetty among others) and our work of last year, especially on the 

 * [kiezatlas1](http://github.com/mukil/kiezatlas1)
 * [dm4-kiezatlas](http://github.com/mukil/dm4-kiezatlas) module
 * [dm4-kiezatlas-etl](http://github.com/mukil/dm4-kiezatlas-etl) module
 * [dm4-kiezatlas-angebote](http://github.com/mukil/dm4-kiezatlas-angebote) module
 * [dm4-geospatial](http://github.com/mukil/dm4-geospatial) module
 * [dm4-webpages](http://github.com/mukil/dm4-webpages) module
 * [dm4-sign-up](http://github.com/mukil/dm4-sign-up) module
 * [dm4-thymeleaf](http://github.com/jri/dm4-thymeleaf) module

but also on other open source software, such as

 * [jQuery](http://www.jquery.com)
 * [jQueryUI](http://www.jqueryui.com)
 * [SemanticUI CSS](http://www.semantic-ui.com)
 * [LeafletJS](http://www.leafletjs.com)

and on the Tile Map Service of [www.mapbox.com](http://www.mapbox.com).

### Usage & Development

If you want to adapt this software make sure to have your development environment set up like described in the DeepaMehta [Plugin Development Guide](https://trac.deepamehta.de/wiki/PluginDevelopmentGuide).

```
cd dm4-kiezatlas-website
grunt
mvn clean package
```

Author:<br/>
Malte Reißig, Copyright 2015-2016
