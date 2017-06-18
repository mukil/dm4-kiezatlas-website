package de.kiezatlas.website.model;

import de.deepamehta.core.JSONEnabled;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.codehaus.jettison.json.JSONArray;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;

/**
 *
 * @author malted
 */
public class SearchKeywords implements JSONEnabled {

    private final Logger log = Logger.getLogger(getClass().getName());
    
    JSONObject json = new JSONObject();

    public void addKeyword(String type, String name) {
        try {
            if (!json.has(type)) {
                initKeywordType(type);
            }
            json.getJSONArray(type).put(name);
        } catch (JSONException ex) {
            Logger.getLogger(SearchKeywords.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void initKeywordType(String typeName) throws JSONException {
        if (!json.has(typeName)) {
            log.info("Initializing keyword typeList " + typeName);
            json.put(typeName, new ArrayList());
        }
    }

    public int size() {
        int count = 0;
        Iterator lists = json.keys();
        while (lists.hasNext()) {
            Object typeList = lists.next();
            if (typeList instanceof JSONArray) {
                count += ((JSONArray) typeList).length();
            } else {
                log.info("Skip json property " + typeList);
            }
            /**             Object typeList = json.get(type);
            if (typeList instanceof ArrayList) {
                ArrayList names = (ArrayList) typeList;
                names.add(name);
            } */
        }
        return count;
    }

    @Override
    public JSONObject toJSON() {
        return json;
    }

}
