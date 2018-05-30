package de.kiezatlas.website.migrations;

import de.deepamehta.core.RelatedTopic;
import de.deepamehta.core.Topic;
import de.deepamehta.core.service.Migration;
import static de.kiezatlas.KiezatlasService.GEO_OBJECT;
import java.util.List;
import java.util.logging.Logger;

/**
 * Remove geo objects for which users had not gathered consent.
 * @author malted
 */
public class Migration18 extends Migration {

    private Logger log = Logger.getLogger(getClass().getName());



    @Override
    public void run() {
        log.info("### Migration 18 Started: Remove entries on \"Hebammen, Psycho, Arzt and Ärzte\"...");
        List<Topic> hebammenNames = dm4.searchTopics("*hebamme*", "ka2.geo_object.name");
        for (Topic hebammenName : hebammenNames) {
            log.info("> Deleting Geo Object " + hebammenName.getSimpleValue()  + " Topic ID: " + hebammenName.getId());
            RelatedTopic geoObject = getRelatedGeoObject(hebammenName);
            geoObject.delete();
        }
        List<Topic> psychoNames = dm4.searchTopics("psychotherap*", "ka2.geo_object.name");
        for (Topic psychoName : psychoNames) {
            log.info("> Deleting Geo Object " + psychoName.getSimpleValue() + " Topic ID: " + psychoName.getId());
            RelatedTopic geoObject = getRelatedGeoObject(psychoName);
            geoObject.delete();
        }
        List<Topic> arztNames = dm4.searchTopics("*arzt*", "ka2.geo_object.name");
        for (Topic arztName : arztNames) {
            log.info("> Deleting Geo Object " + arztName.getSimpleValue() + " Topic ID: " + arztName.getId());
            RelatedTopic geoObject = getRelatedGeoObject(arztName);
            geoObject.delete();
        }
        List<Topic> aerzteNames = dm4.searchTopics("*ärzte*", "ka2.geo_object.name");
        for (Topic aerzteName : aerzteNames) {
            log.info("> Deleting Geo Object " + aerzteName.getSimpleValue() + " Topic ID: " + aerzteName.getId());
            RelatedTopic geoObject = getRelatedGeoObject(aerzteName);
            geoObject.delete();
        }
        int count = psychoNames.size() + hebammenNames.size() + aerzteNames.size() + arztNames.size();
        log.info("### Deleted " + psychoNames.size() + " Geo Objects with Psycho in Name");
        log.info("### Deleted " + hebammenNames.size() + " Geo Objects with Hebamme in Name");
        log.info("### Deleted " + aerzteNames.size() + " Geo Objects with Ärzte in Name");
        log.info("### Deleted " + arztNames.size() + " Geo Objects with Arzt in Name");
        log.info("### Migration 18 COMPLETED: Removed "+count+" geo objects by search result");
    }

    private RelatedTopic getRelatedGeoObject(Topic topic) {
        return topic.getRelatedTopic("dm4.core.composition", "dm4.core.child", "dm4.core.parent", GEO_OBJECT);
    }

}
