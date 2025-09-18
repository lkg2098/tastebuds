import { fireEvent, render, userEvent } from "@testing-library/react-native";
import { screen, renderRouter } from "expo-router/testing-library";

import ChangeDisplayName from "./ChangeDisplayName";
import { View } from "react-native";
import axios, { AxiosResponse } from "axios";
import axiosAuth from "@/api/auth";

jest.mock("axios", () => {
  return {
    create: () => {
      return {
        interceptors: {
          request: { eject: jest.fn(), use: jest.fn() },
          response: { eject: jest.fn(), use: jest.fn() },
        },
      };
    },
  };
});

const mockedAxios = axiosAuth as jest.Mocked<typeof axios>;

mockedAxios.put = jest.fn().mockResolvedValue({
  status: 200,
  data: "test",
});

const setUpTest = (args?: { previousName?: string }) => {
  const index = jest.fn(() => <View />);
  const screen = render(
    <ChangeDisplayName previousName={args?.previousName} />
  );
  const elements = {
    getInput: () => screen.getByTestId("display-name-input"),
    getSubmitButton: () => screen.getByTestId("display-name-submit"),
  };
  return { screen, elements };
};

describe("ChangeDisplayName", () => {
  it("renders the screen", () => {
    const { elements } = setUpTest();
    expect(elements.getInput()).toBeVisible();
    expect(elements.getSubmitButton()).toBeVisible();
  });
  it("renders the submit button as disabled", () => {
    const { elements } = setUpTest();
    expect(elements.getSubmitButton()).toBeDisabled();
  });
  describe("when changing input", () => {
    it("enableds the submit button", () => {
      const { elements } = setUpTest();
      expect(elements.getSubmitButton()).toBeDisabled();
      fireEvent.changeText(elements.getInput(), "New Name");
      expect(elements.getSubmitButton()).toBeEnabled();
    });
  });
  describe("when previous name", () => {
    it("renders the name in the input field", () => {
      const { elements } = setUpTest({ previousName: "TestName" });
      expect(elements.getInput().props.value).toBe("TestName");
    });
    describe("when input value does not equal previous name", () => {
      it("enableds the submit button", () => {
        const { elements } = setUpTest();
        expect(elements.getSubmitButton()).toBeDisabled();
        fireEvent.changeText(elements.getInput(), "New Name");
        expect(elements.getSubmitButton()).toBeEnabled();
      });
    });
  });
  describe("when pressing submit", () => {
    it("submits the form", async () => {
      const { screen, elements } = setUpTest();
      fireEvent.changeText(elements.getInput(), "New Name");
      expect(elements.getSubmitButton()).toBeEnabled();
      fireEvent.press(elements.getSubmitButton());
      expect(mockedAxios.put).toHaveBeenCalled();
      expect(mockedAxios.put).toHaveBeenLastCalledWith("/users/account", {
        name: "New Name",
      });
      expect((await mockedAxios.put.mock.results[0].value).status).toBe(200);
    });
  });
});
