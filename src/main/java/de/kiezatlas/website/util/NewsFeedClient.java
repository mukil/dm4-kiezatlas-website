package de.kiezatlas.website.util;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.StringReader;
import java.io.UnsupportedEncodingException;
import java.net.URL;
import java.net.URLConnection;
import java.net.UnknownHostException;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Logger;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.MediaType;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import org.w3c.dom.CharacterData;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;

/**
 *
 * @author malted
 */
public class NewsFeedClient {

    Logger log = Logger.getLogger(getClass().getName());
    URL rssFeedUrl = null;

    public NewsFeedClient(URL feedUrl) {
        this.rssFeedUrl = feedUrl;
    }

    public List<NewsFeedItem> fetchSiteRSSFeed() {
       StringBuffer result = new StringBuffer();
       try {
           log.info("Fetching XML Site Feed " + rssFeedUrl);
           URLConnection connection = rssFeedUrl.openConnection();
           connection.setRequestProperty("Content-Type", MediaType.APPLICATION_XML);
           // 2) Read in the response
           BufferedReader rd = new BufferedReader(new InputStreamReader(connection.getInputStream(), "UTF-8"));
           String line = "";
           while (rd.ready()) {
               line = rd.readLine();
               result.append(line);
           }
           rd.close();
           List<NewsFeedItem> newsfeed = parseXMLNewsfeedString(result, 3);
           log.info("Site Feed OK - Fetched " + newsfeed.size() + " news items");
           return newsfeed;
       } catch (UnknownHostException uke) {
           throw new WebApplicationException(uke);
       } catch (UnsupportedEncodingException ex) {
           throw new WebApplicationException(ex);
       } catch (IOException ex) {
           throw new WebApplicationException(ex);
       }
    }

    private List<NewsFeedItem> parseXMLNewsfeedString(StringBuffer result, int maxItems) {
       try {
           DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
           DocumentBuilder db = dbf.newDocumentBuilder();
           InputSource is = new InputSource();
           is.setCharacterStream(new StringReader(result.toString()));
           Document doc = db.parse(is);
           NodeList nodes = doc.getElementsByTagName("item");
           // iterate the employees
           int count = 0;
           List<NewsFeedItem> feedItems = new ArrayList<NewsFeedItem>();
           for (int i = 0; i < nodes.getLength(); i++) {
              Element element = (Element) nodes.item(i);
              NewsFeedItem newsItem = new NewsFeedItem();
              // Title of News
              NodeList name = element.getElementsByTagName("title");
              Element line = (Element) name.item(0);
              newsItem.setTitle(getCharacterDataFromElement(line));
              // Text of News
              NodeList description = element.getElementsByTagName("description");
              line = (Element) description.item(0);
              newsItem.setDescription(getCharacterDataFromElement(line));
              // Link URL
              NodeList link = element.getElementsByTagName("link");
              line = (Element) link.item(0);
              newsItem.setLink(getCharacterDataFromElement(line));
              // Date Published
              NodeList title = element.getElementsByTagName("pubDate");
              line = (Element) title.item(0);
              newsItem.setPublished(getCharacterDataFromElement(line));
              // Add news Item
              feedItems.add(newsItem);
              count++;
              if (count == maxItems) break;
           }
           return feedItems;
       }
       catch (Exception e) {
           throw new RuntimeException(e);
       }
    }

    private String getCharacterDataFromElement(Element e) {
        Node child = e.getFirstChild();
        if (child instanceof CharacterData) {
            CharacterData cd = (CharacterData) child;
            return cd.getData();
        }
        return "?";
    }

}
