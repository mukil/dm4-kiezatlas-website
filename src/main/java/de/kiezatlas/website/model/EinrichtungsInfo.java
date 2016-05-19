package de.kiezatlas.website.model;

import de.deepamehta.core.JSONEnabled;
import de.deepamehta.plugins.geomaps.model.GeoCoordinate;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;

/**
 *
 * @author malted
 */
public class EinrichtungsInfo implements JSONEnabled {
    
    public JSONObject json = null;

    public EinrichtungsInfo() {
        json = new JSONObject();
    }

    public void setName(String nameValue) {
        try {
            json.put("name", nameValue);
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void setAnsprechpartner(String kontaktValue) {
        try {
            json.put("ansprechpartner", kontaktValue);
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
    }
    
    public void setTelefon(String kontaktValue) {
        try {
            json.put("telefon", kontaktValue);
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
    }
    
    public void setFax(String kontaktValue) {
        try {
            json.put("fax", kontaktValue);
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
    }
    
    public void setEmail(String kontaktValue) {
        try {
            json.put("email", kontaktValue);
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void setOeffnungszeiten(String kontaktValue) {
        try {
            json.put("oeffnungszeiten", kontaktValue);
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void setAddress(String addressValue) {
        try {
            json.put("anschrift", addressValue);
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void setWebpage(String webpageValue) {
        try {
            json.put("webpage", webpageValue);
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void setBeschreibung(String descriptionValue) {
        try {
            json.put("beschreibung", descriptionValue);
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
    }
    
    public void setStichworte(String descriptionValue) {
        try {
            json.put("stichworte", descriptionValue);
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
    }
    
    public void setLORId(String descriptionValue) {
        try {
            json.put("lor_nr", descriptionValue);
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void setImprintUrl(String descriptionValue) {
        try {
            json.put("imprint", descriptionValue);
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void setId(long id) {
        try {
            json.put("id", id);
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void setCoordinate(GeoCoordinate coordinate) {
        try {
            json.put("location", coordinate.lat + ", " + coordinate.lon);
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public JSONObject toJSON() {
        return json;
    }

    /** --------------------------- Thymeleaf Getter ----------------- */

    public String getName() {
        try {
            return json.getString("name");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.FINE, "EinrichtungsInfo has no Name (Id:" + getId() + ")", ex);
            return "";
        }
    }

    public String getBeschreibung() {
        try {
            return json.getString("beschreibung");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.FINE, "Einrichtung has no Beschreibung (Id: " + getId() + ")", ex);
            return "";
        }
    }

    public String getAnsprechpartner() {
        try {
            return json.getString("ansprechpartner");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.FINE, "Einrichtung has no Ansprechpartner (Id: " + getId() + ")", ex);
            return "";
        }
    }
    
    public String getFax() {
        try {
            return json.getString("fax");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.FINE, "Einrichtung has no Fax (Id: " + getId() + ")", ex);
            return "";
        }
    }
    
    public String getEmail() {
        try {
            return json.getString("email");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.FINE, "Einrichtung has Email (Id: " + getId() + ")", ex);
            return "";
        }
    }
    
    public String getTelefon() {
        try {
            return json.getString("telefon");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.FINE, "Einrichtung has no Telefon (Id: " + getId() + ")", ex);
            return "";
        }
    }

    public String getImprint() {
        try {
            return json.getString("imprint");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.FINE, "Einrichtung has no Imprint (Id: " + getId() + ")", ex);
            return "";
        }
    }

    public String getAddress() {
        try {
            return json.getString("anschrift");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.FINE, "Einrichtung has no Anschrift (Id: " + getId() + ")", ex);
            return "";
        }
    }
    
    public String getOeffnungszeiten() {
        try {
            return json.getString("oeffnungszeiten");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.FINE, "Einrichtung has no Öffnungszeiten (Id: " + getId() + ")", ex);
            return "";
        }
    }

    public String getWebpage() {
        try {
            return json.getString("webpage");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.FINE, "Einrichtung has no Website (Id: " + getId() + ")", ex);
            return "";
        }
    }
    
    public String getStichworte() {
        try {
            return json.getString("stichworte");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.FINE, "Einrichtung has no Stichworte (Id: " + getId() + ")", ex);
            return "";
        }
    }
    
    public String getLor() {
        try {
            return json.getString("lor_nr");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.FINE, "Einrichtung has no LOR ID (Id: " + getId() + ")", ex);
            return "";
        }
    }
    
    public String getCoordinate() {
        try {
            return json.getString("location");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.WARNING, "Einrichtung has no location (Id: " + getId() + ")", ex);
            return "";
        }
    }
   
    public long getId() {
        try {
            return json.getLong("id");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
        return -1;
    }

    /** ------------------------- Java Object API Overrides --------------------- */
    
    @Override
    public boolean equals(Object obj) {
        boolean equal = false;
        if (obj instanceof EinrichtungsInfo) {
            equal = (this.getId() == ((EinrichtungsInfo) obj).getId());
        }
        return equal;
    }

    @Override
    public int hashCode() {
        int hash = 7;
        hash = 29 * hash + (this.json != null ? this.json.hashCode() : 0);
        return hash;
    }

}
