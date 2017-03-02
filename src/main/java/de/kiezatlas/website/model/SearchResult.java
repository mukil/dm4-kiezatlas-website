/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package de.kiezatlas.website.model;

import de.deepamehta.core.JSONEnabled;
import de.deepamehta.core.Topic;
import de.kiezatlas.KiezatlasService;
import de.kiezatlas.angebote.AngebotService;
import de.kiezatlas.website.WebsitePlugin;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;

/**
 *
 * @author malted
 */
public class SearchResult implements JSONEnabled {
    
    JSONObject result = new JSONObject();
    
    public SearchResult(Topic topic) {
        try {
            result.put("name", topic.getSimpleValue());
            if (topic.getTypeUri().equals(KiezatlasService.GEO_OBJECT)) {
                result.put("link", "/" + WebsitePlugin.GEO_OBJECT_RESOURCE + topic.getId());
            } else if (topic.getTypeUri().equals(AngebotService.ANGEBOT)) {
                result.put("link", "/" + WebsitePlugin.ANGEBOTE_RESOURCE + topic.getId());
            }
        } catch (JSONException ex) {
            throw new RuntimeException("Constructing a SearchResult failed", ex);
        }
    }

    public SearchResult(Topic topic, String bezirk) {
        try {
            result.put("name", topic.getSimpleValue());
            if (topic.getTypeUri().equals(KiezatlasService.GEO_OBJECT)) {
                result.put("link", "/" + WebsitePlugin.GEO_OBJECT_RESOURCE + topic.getId());
                result.put("zusatz", bezirk); //  String strassehnr,
            } else if (topic.getTypeUri().equals(AngebotService.ANGEBOT)) {
                result.put("link", "/" + WebsitePlugin.ANGEBOTE_RESOURCE + topic.getId());
            }
        } catch (JSONException ex) {
            throw new RuntimeException("Constructing a SearchResult failed", ex);
        }
    }

    @Override
    public JSONObject toJSON() {
        return result;
    }

}
