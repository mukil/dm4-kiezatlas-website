package de.kiezatlas.website.migrations;

import de.deepamehta.core.Topic;
import de.deepamehta.core.service.Migration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.logging.Logger;

/**
 *
 * @author malted
 */
public class Migration12 extends Migration {

    private Logger log = Logger.getLogger(getClass().getName());

    static final String KIEZATLAS_WORKSPACE_URI = "de.kiezatlas.workspace";

    @Override
    public void run() {
        List<Topic> regions = dm4.getTopicsByType("ka2.util.bezirksregion_name");
        HashMap<String, Topic> nameMap = new HashMap<String, Topic>();
        HashMap<Long, Topic> idMap = new HashMap<Long, Topic>();
        List<Topic> deletions = new ArrayList<Topic>();
        // 1) Build up unique region name topics
        for (Topic region : regions) {
            if (!nameMap.containsKey(region.getSimpleValue().toString())) {
                nameMap.put(region.getSimpleValue().toString(), region);
                idMap.put(region.getId(), region);
            }
        }
        // 2) Assign all existing assocs to unique name topics
        for (Topic toBeDeleted : regions) {
            Topic utilParent = toBeDeleted.getRelatedTopic("dm4.core.composition", null, null, "ka2.util.lor");
            Topic nameTopic = nameMap.get(toBeDeleted.getSimpleValue().toString());
            if (nameTopic != null) {
                log.info("Migrating \"" + nameTopic + "\" of LOR Util \"" + utilParent + "\"");
                utilParent.getChildTopics().setRef(nameTopic.getTypeUri(), nameTopic.getId());
                deletions.add(toBeDeleted);
            }
        }
        // 3) Clean up all 
        for (Topic element : deletions) {
            log.info("Removing DUPLICATE Bezirksregion Name " + element.getSimpleValue());
            if (idMap.get(element.getId()) == null) {
                element.delete();   
            }
        }
        HashMap<String, Topic> bezirkMap = new HashMap<String, Topic>();
        HashMap<Long, Topic> bezirIdMap = new HashMap<Long, Topic>();
        List<Topic> bezirke = dm4.getTopicsByType("ka2.util.bezirk_name");
        List<Topic> bezirkDeletions = new ArrayList<Topic>();
        // 1) Build up unique Bezirk name topics
        for (Topic region : bezirke) {
            if (!bezirkMap.containsKey(region.getSimpleValue().toString())) {
                bezirkMap.put(region.getSimpleValue().toString(), region);
                bezirIdMap.put(region.getId(), region);
            }
        }
        // 2) Assign all existing assocs to unique name topics
        for (Topic toBeDeleted : bezirke) {
            Topic utilParent = toBeDeleted.getRelatedTopic("dm4.core.composition", null, null, "ka2.util.lor");
            Topic bezirkNameTopic = bezirkMap.get(toBeDeleted.getSimpleValue().toString());
            if (bezirkNameTopic != null) {
                log.info("Migrating \"" + bezirkNameTopic + "\" of LOR Util \"" + utilParent + "\"");
                utilParent.getChildTopics().setRef(bezirkNameTopic.getTypeUri(), bezirkNameTopic.getId());
                bezirkDeletions.add(toBeDeleted);
            }
        }
        // 3) Clean up all
        for (Topic element : bezirkDeletions) {
            log.info("Removing DUPLICATE Bezirk Name " + element.getSimpleValue());
            if (bezirIdMap.get(element.getId()) == null) {
                element.delete();
            }
        }
    }
    
}
