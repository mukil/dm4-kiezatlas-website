package de.kiezatlas.website;

import de.deepamehta.core.Topic;
import de.kiezatlas.website.model.BezirkView;

import java.util.List;



public interface WebsiteService {

    /**
     * Searching in four child topic types of geo object, returning topics of type "ka2.geo_object".
     */
    List<Topic> searchFulltextInGeoObjectChilds(String searchTerm);

}
